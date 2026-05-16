import cookieParser from "cookie-parser";
import cors from "cors";
import { randomUUID } from "crypto";
import express from "express";
import multer from "multer";
import { z } from "zod";
import { getConfig } from "./config.js";
import { prisma } from "./db.js";
import { clearSessionCookie, readSession, requireSession, setSessionCookie } from "./session.js";
import { emailService } from "./services/email.js";
import {
  ZERO_SIGNATURE_HASH,
  computeDocumentHash,
  computeLinkageHash,
  computeSigningPayloadHash,
  computeWalletHash,
  contractService,
} from "./services/contracts.js";
import { cidHashFromAttributes, hashCid } from "./services/identity.js";
import { ndiService } from "./services/ndi.js";
import { pinataService } from "./services/pinata.js";
import { privyWalletService } from "./services/privy.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const hex32 = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

const ensureCallbackUrl = (url: string) => {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Callback URL must be http(s)");
  return parsed.toString();
};

const ensureOnboarded = async (didKey: string, profile?: { cidHash?: string; fullName?: string }) => {
  const existing = await prisma.user.findUnique({ where: { didKey } });
  if (existing) {
    const shouldUpdate =
      (!!profile?.cidHash && existing.cidHash !== profile.cidHash) ||
      (!!profile?.fullName && existing.fullName !== profile.fullName);
    if (!shouldUpdate) return { user: existing, created: false, txHash: undefined };

    const user = await prisma.user.update({
      where: { didKey },
      data: {
        cidHash: profile?.cidHash || existing.cidHash,
        fullName: profile?.fullName || existing.fullName,
      },
    });
    return { user, created: false, txHash: undefined };
  }

  const wallet = await privyWalletService.createWallet();
  const linkageHash = computeLinkageHash(didKey, wallet.address);
  const txHash = await contractService.registerIdentity(linkageHash, wallet.address as `0x${string}`);
  const user = await prisma.user.create({
    data: {
      didKey,
      privyWalletId: wallet.id,
      privyWalletAddress: wallet.address,
      cidHash: profile?.cidHash,
      fullName: profile?.fullName,
      linkageHash,
    },
  });

  return { user, created: true, txHash };
};

const toPublicSignature = (signature: {
  id: string;
  docHash: string;
  signerWalletHash: string;
  payloadHash: string;
  previousSignatureHash: string;
  signature: string;
  signatureHash: string;
  txHash: string;
  createdAt: Date;
}) => ({
  id: signature.id,
  docHash: signature.docHash,
  signerWalletHash: signature.signerWalletHash,
  payloadHash: signature.payloadHash,
  previousSignatureHash: signature.previousSignatureHash,
  signature: signature.signature,
  signatureHash: signature.signatureHash,
  txHash: signature.txHash,
  createdAt: signature.createdAt,
});

const buildSignatureChain = async (signatureHash: string) => {
  const chain = [];
  const seen = new Set<string>();
  let cursor = signatureHash;
  let brokenAt: string | null = null;

  while (cursor !== ZERO_SIGNATURE_HASH) {
    if (seen.has(cursor)) {
      brokenAt = cursor;
      break;
    }
    seen.add(cursor);

    const signature = await prisma.signature.findUnique({ where: { signatureHash: cursor } });
    if (!signature) {
      brokenAt = cursor;
      break;
    }

    chain.push(toPublicSignature(signature));
    cursor = signature.previousSignatureHash;
  }

  return { chain: chain.reverse(), brokenAt };
};

const ipfsGatewayUrl = (ipfsCid: string) => {
  const base = getConfig().ipfsGatewayBase.replace(/\/$/, "");
  if (base.includes("{cid}")) return base.replace("{cid}", ipfsCid);
  if (base.endsWith("/ipfs")) return `${base}/${ipfsCid}`;
  return `${base}/ipfs/${ipfsCid}`;
};

const toPublicDocument = (document: {
  id: string;
  ipfsCid: string;
  fileName: string | null;
  mimeType: string | null;
  docHash: string;
  ownerWallet: string;
  txHash: string | null;
  createdAt: Date;
}) => ({
  ...document,
  ipfsGatewayUrl: ipfsGatewayUrl(document.ipfsCid),
});

const toPublicPeerRequest = (
  request: {
    id: string;
    token: string;
    docHash: string;
    requesterEmail: string;
    targetEmail: string;
    requesterSignatureHash: string;
    targetSignatureHash: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    signedAt: Date | null;
  },
  document?: {
    id: string;
    ipfsCid: string;
    fileName: string | null;
    mimeType: string | null;
    docHash: string;
    ownerWallet: string;
    txHash: string | null;
    createdAt: Date;
  } | null,
) => ({
  id: request.id,
  token: request.token,
  docHash: request.docHash,
  requesterEmail: request.requesterEmail,
  targetEmail: request.targetEmail,
  requesterSignatureHash: request.requesterSignatureHash,
  targetSignatureHash: request.targetSignatureHash,
  status: request.status,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  signedAt: request.signedAt,
  document: document ? toPublicDocument(document) : null,
  signingLink: `${getConfig().frontendOrigin}/user-to-user/sign/${request.token}`,
  verificationLink: request.targetSignatureHash ? `${getConfig().frontendOrigin}/verify/${request.targetSignatureHash}` : null,
});

const validatePreviousSignature = async (documentHash: string, previousSignatureHash: string) => {
  if (previousSignatureHash === ZERO_SIGNATURE_HASH) return;
  const previousSignature = await prisma.signature.findUnique({ where: { signatureHash: previousSignatureHash } });
  if (!previousSignature) throw new Error("Previous signature not found");
  if (previousSignature.docHash !== documentHash) throw new Error("Previous signature belongs to a different document");
};

const signDocumentForDid = async (
  didKey: string,
  documentHash: string,
  previousSignatureHash: string,
  profile?: { cidHash?: string; fullName?: string },
) => {
  await validatePreviousSignature(documentHash, previousSignatureHash);

  const { user } = await ensureOnboarded(didKey, profile);
  const payloadHash = computeSigningPayloadHash(documentHash as `0x${string}`, previousSignatureHash as `0x${string}`);
  const signed = await privyWalletService.signDocumentHash(user.privyWalletId, payloadHash);
  const signerWalletHash = computeWalletHash(user.privyWalletAddress);
  let signature = await prisma.signature.findUnique({ where: { signatureHash: signed.signatureHash } });

  if (!signature) {
    const txHash = await contractService.logSignature(
      documentHash as `0x${string}`,
      payloadHash,
      signed.signatureHash,
      previousSignatureHash as `0x${string}`,
      signerWalletHash,
    );

    signature = await prisma.signature.create({
      data: {
        docHash: documentHash,
        signerDid: didKey,
        signerWallet: user.privyWalletAddress,
        signerWalletHash,
        payloadHash,
        previousSignatureHash,
        signature: signed.signature,
        signatureHash: signed.signatureHash,
        txHash,
      },
    });
  }

  return { signature, signed };
};

export const createApp = () => {
  const config = getConfig();
  const app = express();

  app.use(cors({ origin: config.frontendOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "bondchain-backend" });
  });

  app.post("/auth/ndi/initiate", async (_req, res, next) => {
    try {
      res.json(await ndiService.createLoginProofRequest());
    } catch (error) {
      next(error);
    }
  });

  app.get("/auth/ndi/status/:threadId", async (req, res, next) => {
    try {
      const result = ndiService.getProofResult(req.params.threadId);
      if (!result) {
        res.json({ status: "PENDING" });
        return;
      }
      if (!result.validated || !result.holderDid) {
        res.status(400).json({ status: "FAILED", result });
        return;
      }

      const cidHash = cidHashFromAttributes(result.revealedAttributes);
      const fullName = result.revealedAttributes["Full Name"];
      setSessionCookie(res, { didKey: result.holderDid, cidHash, fullName });
      const user = await prisma.user.findUnique({ where: { didKey: result.holderDid } });
      if (user && (cidHash || fullName)) {
        await prisma.user.update({
          where: { didKey: result.holderDid },
          data: { cidHash: cidHash || user.cidHash, fullName: fullName || user.fullName },
        });
      }
      res.json({
        status: "VERIFIED",
        didKey: result.holderDid,
        cidHash,
        revealedAttributes: result.revealedAttributes,
        user,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/session/verify", async (req, res) => {
    const session = readSession(req);
    if (!session) {
      res.status(401).json({ valid: false });
      return;
    }
    const user = await prisma.user.findUnique({ where: { didKey: session.didKey } });
    res.json({ valid: true, didKey: session.didKey, cidHash: session.cidHash || user?.cidHash, user });
  });

  app.post("/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post("/onboard", requireSession, async (_req, res, next) => {
    try {
      const session = res.locals.session as { didKey: string; cidHash?: string; fullName?: string };
      res.json(await ensureOnboarded(session.didKey, { cidHash: session.cidHash, fullName: session.fullName }));
    } catch (error) {
      next(error);
    }
  });

  app.post("/documents/upload", requireSession, upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Missing file" });
        return;
      }

      if (req.file.mimetype !== "application/pdf" || !req.file.originalname.toLowerCase().endsWith(".pdf")) {
        res.status(400).json({ error: "Only PDF documents are supported" });
        return;
      }

      const session = res.locals.session as { didKey: string; cidHash?: string; fullName?: string };
      const { user } = await ensureOnboarded(session.didKey, { cidHash: session.cidHash, fullName: session.fullName });
      const docHash = computeDocumentHash(req.file.buffer);
      const uploaded = await pinataService.uploadFile(req.file);
      const txHash = await contractService.registerDocument(
        docHash,
        user.privyWalletAddress as `0x${string}`,
        uploaded.cid,
      );
      const document = await prisma.document.create({
        data: {
          ipfsCid: uploaded.cid,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          docHash,
          ownerDid: session.didKey,
          ownerWallet: user.privyWalletAddress,
          txHash,
        },
      });

      res.json({ document: toPublicDocument(document) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/signing/initiate", async (req, res, next) => {
    try {
      const input = z
        .object({
          documentHash: hex32,
          previousSignatureHash: hex32.optional(),
          callbackUrl: z.string().url().transform(ensureCallbackUrl),
          documentName: z.string().min(1).optional(),
        })
        .parse(req.body);
      const previousSignatureHash = input.previousSignatureHash || ZERO_SIGNATURE_HASH;
      if (previousSignatureHash !== ZERO_SIGNATURE_HASH) {
        const previousSignature = await prisma.signature.findUnique({ where: { signatureHash: previousSignatureHash } });
        if (!previousSignature) {
          res.status(400).json({ error: "Previous signature not found" });
          return;
        }
        if (previousSignature.docHash !== input.documentHash) {
          res.status(400).json({ error: "Previous signature belongs to a different document" });
          return;
        }
      }

      const token = randomUUID();
      const session = await prisma.signingSession.create({
        data: {
          token,
          documentHash: input.documentHash,
          previousSignatureHash,
          callbackUrl: input.callbackUrl,
          documentName: input.documentName,
        },
      });

      res.json({ redirectUrl: `${config.frontendOrigin}/sign?session=${token}`, session });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/signing/session/:token", async (req, res, next) => {
    try {
      const session = await prisma.signingSession.findUniqueOrThrow({ where: { token: req.params.token } });
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  app.post("/sign/document", requireSession, async (req, res, next) => {
    try {
      const input = z
        .object({
          documentHash: hex32.optional(),
          previousSignatureHash: hex32.optional(),
          signingSessionToken: z.string().optional(),
        })
        .refine(value => value.documentHash || value.signingSessionToken, "documentHash or signingSessionToken is required")
        .parse(req.body);
      const signingSession = input.signingSessionToken
        ? await prisma.signingSession.findUniqueOrThrow({ where: { token: input.signingSessionToken } })
        : null;
      const documentHash = input.documentHash || signingSession?.documentHash;
      if (!documentHash) {
        res.status(400).json({ error: "Document hash is required" });
        return;
      }
      if (input.documentHash && signingSession && input.documentHash !== signingSession.documentHash) {
        res.status(400).json({ error: "Document hash does not match signing session" });
        return;
      }

      const previousSignatureHash =
        input.previousSignatureHash || signingSession?.previousSignatureHash || ZERO_SIGNATURE_HASH;
      if (previousSignatureHash !== ZERO_SIGNATURE_HASH) {
        const previousSignature = await prisma.signature.findUnique({ where: { signatureHash: previousSignatureHash } });
        if (!previousSignature) {
          res.status(400).json({ error: "Previous signature not found" });
          return;
        }
        if (previousSignature.docHash !== documentHash) {
          res.status(400).json({ error: "Previous signature belongs to a different document" });
          return;
        }
      }

      const session = res.locals.session as { didKey: string; cidHash?: string; fullName?: string };
      const { signature, signed } = await signDocumentForDid(session.didKey, documentHash, previousSignatureHash, {
        cidHash: session.cidHash,
        fullName: session.fullName,
      });

      let callbackUrl: string | undefined;
      if (input.signingSessionToken) {
        const session = await prisma.signingSession.update({
          where: { token: input.signingSessionToken },
          data: { status: "SIGNED", signatureHash: signed.signatureHash, txHash: signature.txHash },
        });
        const url = new URL(session.callbackUrl);
        url.searchParams.set("signature", signed.signature);
        url.searchParams.set("signatureHash", signed.signatureHash);
        url.searchParams.set("txHash", signature.txHash);
        url.searchParams.set("verificationLink", `${config.frontendOrigin}/verify/${signed.signatureHash}`);
        callbackUrl = url.toString();
      }

      const publicSignature = {
        ...toPublicSignature(signature),
      };
      res.json({
        signature: publicSignature,
        callbackUrl,
        verificationLink: `${config.frontendOrigin}/verify/${signed.signatureHash}`,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/peer-requests", requireSession, async (req, res, next) => {
    try {
      const input = z
        .object({
          docHash: hex32,
          requesterSignatureHash: hex32,
          targetCid: z.string().min(1),
          targetEmail: z.string().email(),
          requesterEmail: z.string().email(),
        })
        .parse(req.body);
      const didKey = res.locals.session.didKey as string;
      const [document, requesterSignature] = await Promise.all([
        prisma.document.findFirst({
          where: { docHash: input.docHash, ownerDid: didKey },
          orderBy: { createdAt: "desc" },
        }),
        prisma.signature.findUnique({ where: { signatureHash: input.requesterSignatureHash } }),
      ]);

      if (!document) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      if (document.ownerDid !== didKey) {
        res.status(403).json({ error: "Only the document owner can send a signing request" });
        return;
      }
      if (!requesterSignature || requesterSignature.docHash !== input.docHash || requesterSignature.signerDid !== didKey) {
        res.status(400).json({ error: "Requester signature is not valid for this document" });
        return;
      }

      const token = randomUUID();
      const request = await prisma.peerSigningRequest.create({
        data: {
          token,
          documentId: document.id,
          docHash: input.docHash,
          requesterDid: didKey,
          requesterEmail: input.requesterEmail,
          targetEmail: input.targetEmail,
          targetCidHash: hashCid(input.targetCid),
          requesterSignatureHash: input.requesterSignatureHash,
        },
      });

      const publicRequest = toPublicPeerRequest(request, document);
      await emailService.sendPeerSigningRequest({
        to: input.targetEmail,
        requesterEmail: input.requesterEmail,
        documentHash: input.docHash,
        signingUrl: publicRequest.signingLink,
      });

      res.json({ request: publicRequest });
    } catch (error) {
      next(error);
    }
  });

  app.get("/peer-requests/:token", async (req, res, next) => {
    try {
      const token = String(req.params.token);
      const request = await prisma.peerSigningRequest.findUnique({
        where: { token },
        include: { document: true },
      });
      if (!request) {
        res.status(404).json({ error: "Signing request not found" });
        return;
      }

      res.json({ request: toPublicPeerRequest(request, request.document) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/peer-requests/:token/sign", requireSession, async (req, res, next) => {
    try {
      const session = res.locals.session as { didKey: string; cidHash?: string };
      const token = String(req.params.token);
      const request = await prisma.peerSigningRequest.findUnique({
        where: { token },
        include: { document: true },
      });
      if (!request) {
        res.status(404).json({ error: "Signing request not found" });
        return;
      }
      if (request.status === "SIGNED" && request.targetSignatureHash) {
        res.json({
          request: toPublicPeerRequest(request, request.document),
          verificationLink: `${config.frontendOrigin}/verify/${request.targetSignatureHash}`,
        });
        return;
      }

      const user = await prisma.user.findUnique({ where: { didKey: session.didKey } });
      const resolvedCidHash = session.cidHash || user?.cidHash;
      if (!resolvedCidHash) {
        res.status(403).json({ error: "NDI session does not include a CID. Please log in with NDI again." });
        return;
      }
      if (resolvedCidHash !== request.targetCidHash) {
        res.status(403).json({ error: "This NDI identity is not authorized to sign this request" });
        return;
      }

      const { signature } = await signDocumentForDid(session.didKey, request.docHash, request.requesterSignatureHash, {
        cidHash: session.cidHash,
      });
      const updated = await prisma.peerSigningRequest.update({
        where: { token: request.token },
        data: {
          status: "SIGNED",
          targetSignatureHash: signature.signatureHash,
          signedAt: new Date(),
        },
        include: { document: true },
      });
      const verificationLink = `${config.frontendOrigin}/verify/${signature.signatureHash}`;
      await emailService.sendPeerSigningCompleted({
        to: request.requesterEmail,
        targetEmail: request.targetEmail,
        documentHash: request.docHash,
        verificationLink,
      });

      res.json({ request: toPublicPeerRequest(updated, updated.document), verificationLink });
    } catch (error) {
      next(error);
    }
  });

  app.get("/history", requireSession, async (_req, res, next) => {
    try {
      const session = res.locals.session as { didKey: string; cidHash?: string };
      const user = await prisma.user.findUnique({ where: { didKey: session.didKey } });
      const cidHash = session.cidHash || user?.cidHash;
      const [documents, signatures, sentRequests, receivedRequests] = await Promise.all([
        prisma.document.findMany({ where: { ownerDid: session.didKey }, orderBy: { createdAt: "desc" } }),
        prisma.signature.findMany({ where: { signerDid: session.didKey }, orderBy: { createdAt: "desc" } }),
        prisma.peerSigningRequest.findMany({
          where: { requesterDid: session.didKey },
          include: { document: true },
          orderBy: { updatedAt: "desc" },
        }),
        cidHash
          ? prisma.peerSigningRequest.findMany({
              where: { targetCidHash: cidHash },
              include: { document: true },
              orderBy: { updatedAt: "desc" },
            })
          : Promise.resolve([]),
      ]);

      const signatureCounts = await prisma.signature.groupBy({
        by: ["docHash"],
        where: { docHash: { in: documents.map(document => document.docHash) } },
        _count: { docHash: true },
      });
      const signatureCountByDoc = new Map(signatureCounts.map(item => [item.docHash, item._count.docHash]));

      res.json({
        user: user
          ? {
              didKey: user.didKey,
              privyWalletAddress: user.privyWalletAddress,
              cidHash: user.cidHash,
              fullName: user.fullName,
            }
          : null,
        documents: documents.map(document => ({
          ...toPublicDocument(document),
          signatureCount: signatureCountByDoc.get(document.docHash) || 0,
        })),
        signatures: signatures.map(toPublicSignature),
        sentRequests: sentRequests.map(request => toPublicPeerRequest(request, request.document)),
        receivedRequests: receivedRequests.map(request => toPublicPeerRequest(request, request.document)),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/verify/:signatureHash", async (req, res, next) => {
    try {
      const signature = await prisma.signature.findUnique({ where: { signatureHash: req.params.signatureHash } });
      if (!signature) {
        res.status(404).json({ error: "Signature not found" });
        return;
      }

      const document = await prisma.document.findFirst({
        where: { docHash: signature.docHash },
        orderBy: { createdAt: "desc" },
      });
      const { chain, brokenAt } = await buildSignatureChain(signature.signatureHash);
      res.json({
        signature: toPublicSignature(signature),
        chain,
        chainStatus: brokenAt ? "BROKEN" : "VERIFIED",
        brokenAt,
        document,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/verify/:signatureHash/signer", requireSession, async (req, res, next) => {
    try {
      const didKey = res.locals.session.didKey as string;
      const signatureHash = String(req.params.signatureHash);
      const [signature, user] = await Promise.all([
        prisma.signature.findUnique({ where: { signatureHash } }),
        prisma.user.findUnique({ where: { didKey } }),
      ]);

      if (!signature) {
        res.status(404).json({ error: "Signature not found" });
        return;
      }
      if (!user) {
        res.status(404).json({ error: "NDI identity is not onboarded in BondChain" });
        return;
      }

      const resolvedWalletHash = computeWalletHash(user.privyWalletAddress);
      const verified = resolvedWalletHash === signature.signerWalletHash;
      res.json({
        verified,
        didKey,
        signerWalletHash: signature.signerWalletHash,
        resolvedWalletHash,
        signatureHash: signature.signatureHash,
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", issues: error.issues });
      return;
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  });

  return app;
};
