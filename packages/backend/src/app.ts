import cookieParser from "cookie-parser";
import cors from "cors";
import { randomUUID } from "crypto";
import express from "express";
import multer from "multer";
import { z } from "zod";
import { getConfig } from "./config.js";
import { prisma } from "./db.js";
import {
  clearSessionCookie,
  readSession,
  requireSession,
  setSessionCookie,
} from "./session.js";
import { emailService } from "./services/email.js";
import {
  ZERO_SIGNATURE_HASH,
  computeDocumentHash,
  computeLinkageHash,
  computeSigningPayloadHash,
  computeTextHash,
  computeWalletHash,
  contractService,
} from "./services/contracts.js";
import { cidHashFromAttributes, hashCid } from "./services/identity.js";
import { ndiService } from "./services/ndi.js";
import { pinataService } from "./services/pinata.js";
import { privyWalletService } from "./services/privy.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const hex32 = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

const ensureCallbackUrl = (url: string) => {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Callback URL must be http(s)");
  return parsed.toString();
};

const ensureOnboarded = async (
  didKey: string,
  profile?: { cidHash?: string; fullName?: string },
) => {
  const existing = await prisma.user.findUnique({ where: { didKey } });
  if (existing) {
    const shouldUpdate =
      (!!profile?.cidHash && existing.cidHash !== profile.cidHash) ||
      (!!profile?.fullName && existing.fullName !== profile.fullName);
    if (!shouldUpdate)
      return { user: existing, created: false, txHash: undefined };

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
  const txHash = await contractService.registerIdentity(
    linkageHash,
    wallet.address as `0x${string}`,
  );
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

    const signature = await prisma.signature.findUnique({
      where: { signatureHash: cursor },
    });
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
  verificationLink: request.targetSignatureHash
    ? `${getConfig().frontendOrigin}/verify/${request.targetSignatureHash}`
    : null,
});

const toPublicAgency = (agency: {
  id: string;
  name: string;
  status: string;
  adminEmail: string;
  adminDid: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: agency.id,
  name: agency.name,
  status: agency.status,
  adminEmail: agency.adminEmail,
  adminDid: agency.adminDid,
  createdAt: agency.createdAt,
  updatedAt: agency.updatedAt,
});

const assertPlatformAdmin = (didKey: string) => {
  if (!getConfig().platformAdminDidKeys.includes(didKey))
    throw new Error("Platform admin DID is not authorized");
};

const requireAgencyAdminMember = async (didKey: string, agencyId?: string) => {
  const member = await prisma.agencyMember.findFirst({
    where: {
      didKey,
      role: "ADMIN",
      status: "ACTIVE",
      ...(agencyId ? { agencyId } : {}),
    },
    include: { agency: true },
  });
  if (!member) throw new Error("Agency admin access required");
  return member;
};

const ensurePdfUpload = (file?: Express.Multer.File) => {
  if (!file) throw new Error("Missing PDF file");
  if (
    file.mimetype !== "application/pdf" ||
    !file.originalname.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("Only PDF documents are supported");
  }
};

const firstPendingStep = (steps: { status: string; stepNumber: number }[]) =>
  [...steps]
    .filter((step) => step.status === "PENDING")
    .sort((a, b) => a.stepNumber - b.stepNumber)[0] || null;

const emailNextAgencyStep = async (step: {
  actionToken: string;
  role: string;
  member: { email: string };
  request: { service: { name: string; agency: { name: string } } };
}) => {
  await emailService.sendAgencyActionLink({
    to: step.member.email,
    agencyName: step.request.service.agency.name,
    serviceName: step.request.service.name,
    role: step.role,
    actionUrl: `${getConfig().frontendOrigin}/agency/requests/${step.actionToken}`,
  });
};

const completeAgencyStep = async (requestId: string) => {
  const steps = await prisma.agencyRequestStep.findMany({
    where: { requestId },
    include: {
      member: true,
      request: { include: { service: { include: { agency: true } } } },
    },
    orderBy: { stepNumber: "asc" },
  });
  const next = firstPendingStep(steps);
  if (!next) {
    await prisma.agencyServiceRequest.update({
      where: { id: requestId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return null;
  }

  await prisma.agencyServiceRequest.update({
    where: { id: requestId },
    data: { status: "IN_PROGRESS", currentStepNumber: next.stepNumber },
  });
  const expanded =
    steps.find((step) => step.id === (next as { id?: string }).id) ||
    steps.find((step) => step.stepNumber === next.stepNumber);
  if (expanded) await emailNextAgencyStep(expanded);
  return next;
};

const authorizeAgencyStep = async (
  actionToken: string,
  session: { didKey: string; cidHash?: string },
  expectedRole?: string,
) => {
  const step = await prisma.agencyRequestStep.findUnique({
    where: { actionToken },
    include: {
      member: true,
      request: {
        include: {
          service: { include: { agency: true } },
          document: true,
          citizen: true,
          certificate: { include: { document: true } },
        },
      },
    },
  });
  if (!step) throw new Error("Agency request step not found");
  if (step.status !== "PENDING")
    throw new Error("This workflow step is no longer pending");
  if (step.member.status !== "ACTIVE")
    throw new Error("Assigned agency member is no longer active");
  if (expectedRole && step.role !== expectedRole)
    throw new Error(`${expectedRole} step required`);
  if (step.member.didKey !== session.didKey)
    throw new Error("This NDI identity is not assigned to this workflow step");

  const user = await prisma.user.findUnique({
    where: { didKey: session.didKey },
  });
  const resolvedCidHash = session.cidHash || user?.cidHash;
  if (step.member.cidHash && resolvedCidHash !== step.member.cidHash) {
    throw new Error(
      "This NDI identity does not match the assigned officer CID",
    );
  }

  return step;
};

const emailCitizenAgencyUpdate = async (input: {
  citizenEmail?: string | null;
  agencyName: string;
  serviceName: string;
  role: string;
  status: string;
  reason?: string;
  verificationLink?: string;
}) => {
  if (!input.citizenEmail) return;
  await emailService.sendAgencyRequestActionUpdate({
    to: input.citizenEmail,
    agencyName: input.agencyName,
    serviceName: input.serviceName,
    role: input.role,
    status: input.status,
    reason: input.reason,
    verificationLink: input.verificationLink,
  });
};

const validatePreviousSignature = async (
  documentHash: string,
  previousSignatureHash: string,
) => {
  if (previousSignatureHash === ZERO_SIGNATURE_HASH) return;
  const previousSignature = await prisma.signature.findUnique({
    where: { signatureHash: previousSignatureHash },
  });
  if (!previousSignature) throw new Error("Previous signature not found");
  if (previousSignature.docHash !== documentHash)
    throw new Error("Previous signature belongs to a different document");
};

const signDocumentForDid = async (
  didKey: string,
  documentHash: string,
  previousSignatureHash: string,
  profile?: { cidHash?: string; fullName?: string },
) => {
  await validatePreviousSignature(documentHash, previousSignatureHash);

  const { user } = await ensureOnboarded(didKey, profile);
  const payloadHash = computeSigningPayloadHash(
    documentHash as `0x${string}`,
    previousSignatureHash as `0x${string}`,
  );
  const signed = await privyWalletService.signDocumentHash(
    user.privyWalletId,
    payloadHash,
  );
  const signerWalletHash = computeWalletHash(user.privyWalletAddress);
  let signature = await prisma.signature.findUnique({
    where: { signatureHash: signed.signatureHash },
  });

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
      const user = await prisma.user.findUnique({
        where: { didKey: result.holderDid },
      });
      if (user && (cidHash || fullName)) {
        await prisma.user.update({
          where: { didKey: result.holderDid },
          data: {
            cidHash: cidHash || user.cidHash,
            fullName: fullName || user.fullName,
          },
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
    const user = await prisma.user.findUnique({
      where: { didKey: session.didKey },
    });
    res.json({
      valid: true,
      didKey: session.didKey,
      cidHash: session.cidHash || user?.cidHash,
      user,
    });
  });

  app.post("/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post("/onboard", requireSession, async (_req, res, next) => {
    try {
      const session = res.locals.session as {
        didKey: string;
        cidHash?: string;
        fullName?: string;
      };
      res.json(
        await ensureOnboarded(session.didKey, {
          cidHash: session.cidHash,
          fullName: session.fullName,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/documents/upload",
    requireSession,
    upload.single("file"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: "Missing file" });
          return;
        }

        if (
          req.file.mimetype !== "application/pdf" ||
          !req.file.originalname.toLowerCase().endsWith(".pdf")
        ) {
          res.status(400).json({ error: "Only PDF documents are supported" });
          return;
        }

        const session = res.locals.session as {
          didKey: string;
          cidHash?: string;
          fullName?: string;
        };
        const { user } = await ensureOnboarded(session.didKey, {
          cidHash: session.cidHash,
          fullName: session.fullName,
        });
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
    },
  );

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
      const previousSignatureHash =
        input.previousSignatureHash || ZERO_SIGNATURE_HASH;
      if (previousSignatureHash !== ZERO_SIGNATURE_HASH) {
        const previousSignature = await prisma.signature.findUnique({
          where: { signatureHash: previousSignatureHash },
        });
        if (!previousSignature) {
          res.status(400).json({ error: "Previous signature not found" });
          return;
        }
        if (previousSignature.docHash !== input.documentHash) {
          res.status(400).json({
            error: "Previous signature belongs to a different document",
          });
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

      res.json({
        redirectUrl: `${config.frontendOrigin}/sign?session=${token}`,
        session,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/signing/session/:token", async (req, res, next) => {
    try {
      const session = await prisma.signingSession.findUniqueOrThrow({
        where: { token: req.params.token },
      });
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
        .refine(
          (value) => value.documentHash || value.signingSessionToken,
          "documentHash or signingSessionToken is required",
        )
        .parse(req.body);
      const signingSession = input.signingSessionToken
        ? await prisma.signingSession.findUniqueOrThrow({
            where: { token: input.signingSessionToken },
          })
        : null;
      const documentHash = input.documentHash || signingSession?.documentHash;
      if (!documentHash) {
        res.status(400).json({ error: "Document hash is required" });
        return;
      }
      if (
        input.documentHash &&
        signingSession &&
        input.documentHash !== signingSession.documentHash
      ) {
        res
          .status(400)
          .json({ error: "Document hash does not match signing session" });
        return;
      }

      const previousSignatureHash =
        input.previousSignatureHash ||
        signingSession?.previousSignatureHash ||
        ZERO_SIGNATURE_HASH;
      if (previousSignatureHash !== ZERO_SIGNATURE_HASH) {
        const previousSignature = await prisma.signature.findUnique({
          where: { signatureHash: previousSignatureHash },
        });
        if (!previousSignature) {
          res.status(400).json({ error: "Previous signature not found" });
          return;
        }
        if (previousSignature.docHash !== documentHash) {
          res.status(400).json({
            error: "Previous signature belongs to a different document",
          });
          return;
        }
      }

      const session = res.locals.session as {
        didKey: string;
        cidHash?: string;
        fullName?: string;
      };
      const { signature, signed } = await signDocumentForDid(
        session.didKey,
        documentHash,
        previousSignatureHash,
        {
          cidHash: session.cidHash,
          fullName: session.fullName,
        },
      );

      let callbackUrl: string | undefined;
      if (input.signingSessionToken) {
        const session = await prisma.signingSession.update({
          where: { token: input.signingSessionToken },
          data: {
            status: "SIGNED",
            signatureHash: signed.signatureHash,
            txHash: signature.txHash,
          },
        });
        const url = new URL(session.callbackUrl);
        url.searchParams.set("signature", signed.signature);
        url.searchParams.set("signatureHash", signed.signatureHash);
        url.searchParams.set("txHash", signature.txHash);
        url.searchParams.set(
          "verificationLink",
          `${config.frontendOrigin}/verify/${signed.signatureHash}`,
        );
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
        prisma.signature.findUnique({
          where: { signatureHash: input.requesterSignatureHash },
        }),
      ]);

      if (!document) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      if (document.ownerDid !== didKey) {
        res.status(403).json({
          error: "Only the document owner can send a signing request",
        });
        return;
      }
      if (
        !requesterSignature ||
        requesterSignature.docHash !== input.docHash ||
        requesterSignature.signerDid !== didKey
      ) {
        res.status(400).json({
          error: "Requester signature is not valid for this document",
        });
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

  app.post(
    "/peer-requests/:token/sign",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as {
          didKey: string;
          cidHash?: string;
        };
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

        const user = await prisma.user.findUnique({
          where: { didKey: session.didKey },
        });
        const resolvedCidHash = session.cidHash || user?.cidHash;
        if (!resolvedCidHash) {
          res.status(403).json({
            error:
              "NDI session does not include a CID. Please log in with NDI again.",
          });
          return;
        }
        if (resolvedCidHash !== request.targetCidHash) {
          res.status(403).json({
            error: "This NDI identity is not authorized to sign this request",
          });
          return;
        }

        const { signature } = await signDocumentForDid(
          session.didKey,
          request.docHash,
          request.requesterSignatureHash,
          {
            cidHash: session.cidHash,
          },
        );
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

        res.json({
          request: toPublicPeerRequest(updated, updated.document),
          verificationLink,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/admin/agencies", requireSession, async (_req, res, next) => {
    try {
      const session = res.locals.session as { didKey: string };
      assertPlatformAdmin(session.didKey);
      const agencies = await prisma.agency.findMany({
        where: { status: { not: "DELETED" } },
        include: {
          invitations: { orderBy: { createdAt: "desc" }, take: 1 },
          members: { where: { status: "ACTIVE" } },
          services: { where: { active: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({
        agencies: agencies.map((agency) => ({
          ...toPublicAgency(agency),
          latestInvitation: agency.invitations[0] || null,
          memberCount: agency.members.length,
          serviceCount: agency.services.length,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/agencies", requireSession, async (req, res, next) => {
    try {
      const session = res.locals.session as { didKey: string };
      assertPlatformAdmin(session.didKey);
      const input = z
        .object({
          name: z.string().min(2),
          adminEmail: z.string().email(),
          adminCid: z.string().min(1),
        })
        .parse(req.body);

      const agency = await prisma.agency.create({
        data: {
          name: input.name,
          adminEmail: input.adminEmail,
          adminCidHash: hashCid(input.adminCid),
          createdByDid: session.didKey,
        },
      });
      const invitation = await prisma.agencyInvitation.create({
        data: {
          token: randomUUID(),
          agencyId: agency.id,
          email: input.adminEmail,
          cidHash: agency.adminCidHash,
        },
      });
      const txHash = await contractService.logAgencyEnrolled(
        agency.id,
        agency.name,
      );
      await emailService.sendAgencyAdminInvitation({
        to: input.adminEmail,
        agencyName: input.name,
        invitationUrl: `${config.frontendOrigin}/agency/register/${invitation.token}`,
      });

      res.json({ agency: toPublicAgency(agency), invitation, txHash });
    } catch (error) {
      next(error);
    }
  });

  app.delete(
    "/admin/agencies/:agencyId",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as { didKey: string };
        assertPlatformAdmin(session.didKey);
        const agencyId = String(req.params.agencyId);
        const agency = await prisma.agency.update({
          where: { id: agencyId },
          data: { status: "DELETED" },
        });
        await Promise.all([
          prisma.agencyService.updateMany({
            where: { agencyId },
            data: { active: false },
          }),
          prisma.agencyMember.updateMany({
            where: { agencyId },
            data: { status: "REMOVED" },
          }),
          prisma.agencyInvitation.updateMany({
            where: { agencyId, status: "PENDING" },
            data: { status: "CANCELED" },
          }),
          prisma.agencyOfficerInvitation.updateMany({
            where: { agencyId, status: "PENDING" },
            data: { status: "CANCELED" },
          }),
        ]);
        res.json({ agency: toPublicAgency(agency) });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/agency/invitations/:token/accept",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as {
          didKey: string;
          cidHash?: string;
          fullName?: string;
        };
        const invitation = await prisma.agencyInvitation.findUnique({
          where: { token: String(req.params.token) },
          include: { agency: true },
        });
        if (!invitation || invitation.status !== "PENDING") {
          res
            .status(404)
            .json({ error: "Agency invitation not found or already used" });
          return;
        }
        const { user } = await ensureOnboarded(session.didKey, {
          cidHash: session.cidHash,
          fullName: session.fullName,
        });
        const resolvedCidHash = session.cidHash || user.cidHash;
        if (!resolvedCidHash || resolvedCidHash !== invitation.cidHash) {
          res.status(403).json({
            error:
              "This NDI identity does not match the invited agency admin CID",
          });
          return;
        }

        const member = await prisma.agencyMember.upsert({
          where: {
            agencyId_didKey: {
              agencyId: invitation.agencyId,
              didKey: session.didKey,
            },
          },
          create: {
            agencyId: invitation.agencyId,
            didKey: session.didKey,
            email: invitation.email,
            cidHash: resolvedCidHash,
            role: "ADMIN",
          },
          update: {
            role: "ADMIN",
            status: "ACTIVE",
            email: invitation.email,
            cidHash: resolvedCidHash,
          },
        });
        const [agency] = await Promise.all([
          prisma.agency.update({
            where: { id: invitation.agencyId },
            data: { status: "ADMIN_REGISTERED", adminDid: session.didKey },
          }),
          prisma.agencyInvitation.update({
            where: { id: invitation.id },
            data: {
              status: "ACCEPTED",
              acceptedByDid: session.didKey,
              acceptedAt: new Date(),
            },
          }),
        ]);
        const txHash = await contractService.logAgencyAdminRegistered(
          invitation.agencyId,
          computeWalletHash(user.privyWalletAddress),
        );

        res.json({ agency: toPublicAgency(agency), member, txHash });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/agency/me", requireSession, async (_req, res, next) => {
    try {
      const session = res.locals.session as { didKey: string };
      const memberships = await prisma.agencyMember.findMany({
        where: { didKey: session.didKey, status: "ACTIVE" },
        include: {
          agency: true,
          assignedSteps: {
            include: { service: true },
            orderBy: { stepNumber: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      const agencies = await prisma.agency.findMany({
        where: {
          status: { not: "DELETED" },
          members: {
            some: { didKey: session.didKey, role: "ADMIN", status: "ACTIVE" },
          },
        },
        include: {
          members: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
          },
          services: {
            where: { active: true },
            include: {
              workflowSteps: {
                include: { member: true },
                orderBy: { stepNumber: "asc" },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({
        platformAdmin: config.platformAdminDidKeys.includes(session.didKey),
        memberships,
        agencies,
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete(
    "/agency/members/:memberId",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as { didKey: string };
        const member = await prisma.agencyMember.findUniqueOrThrow({
          where: { id: String(req.params.memberId) },
        });
        await requireAgencyAdminMember(session.didKey, member.agencyId);
        if (member.role === "ADMIN") {
          res.status(400).json({
            error: "Agency admin members cannot be removed from this screen",
          });
          return;
        }
        const updated = await prisma.agencyMember.update({
          where: { id: member.id },
          data: { status: "REMOVED" },
        });
        res.json({ member: updated });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/agency/officers", requireSession, async (req, res, next) => {
    try {
      const session = res.locals.session as { didKey: string };
      const input = z
        .object({
          agencyId: z.string().min(1),
          email: z.string().email(),
          cid: z.string().min(1),
        })
        .parse(req.body);
      const admin = await requireAgencyAdminMember(
        session.didKey,
        input.agencyId,
      );
      const invitation = await prisma.agencyOfficerInvitation.create({
        data: {
          token: randomUUID(),
          agencyId: input.agencyId,
          email: input.email,
          cidHash: hashCid(input.cid),
        },
      });
      await emailService.sendAgencyOfficerInvitation({
        to: input.email,
        agencyName: admin.agency.name,
        invitationUrl: `${config.frontendOrigin}/agency/officer/register/${invitation.token}`,
      });
      res.json({ invitation });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/agency/officer-invitations/:token/accept",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as {
          didKey: string;
          cidHash?: string;
          fullName?: string;
        };
        const invitation = await prisma.agencyOfficerInvitation.findUnique({
          where: { token: String(req.params.token) },
        });
        if (!invitation || invitation.status !== "PENDING") {
          res
            .status(404)
            .json({ error: "Officer invitation not found or already used" });
          return;
        }
        const { user } = await ensureOnboarded(session.didKey, {
          cidHash: session.cidHash,
          fullName: session.fullName,
        });
        const resolvedCidHash = session.cidHash || user.cidHash;
        if (!resolvedCidHash || resolvedCidHash !== invitation.cidHash) {
          res.status(403).json({
            error: "This NDI identity does not match the invited officer CID",
          });
          return;
        }
        const [member] = await Promise.all([
          prisma.agencyMember.upsert({
            where: {
              agencyId_didKey: {
                agencyId: invitation.agencyId,
                didKey: session.didKey,
              },
            },
            create: {
              agencyId: invitation.agencyId,
              didKey: session.didKey,
              email: invitation.email,
              cidHash: resolvedCidHash,
              role: "OFFICER",
            },
            update: {
              role: "OFFICER",
              status: "ACTIVE",
              email: invitation.email,
              cidHash: resolvedCidHash,
            },
          }),
          prisma.agencyOfficerInvitation.update({
            where: { id: invitation.id },
            data: {
              status: "ACCEPTED",
              acceptedByDid: session.didKey,
              acceptedAt: new Date(),
            },
          }),
        ]);
        const txHash = await contractService.logAgencyOfficerRegistered(
          invitation.agencyId,
          computeWalletHash(user.privyWalletAddress),
        );
        res.json({ member, txHash });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/agency/services", requireSession, async (req, res, next) => {
    try {
      const session = res.locals.session as { didKey: string };
      const input = z
        .object({
          agencyId: z.string().min(1),
          name: z.string().min(2),
          description: z.string().optional(),
          requirementMode: z.enum(["NDI_ONLY", "DOCUMENT_REQUIRED"]),
        })
        .parse(req.body);
      await requireAgencyAdminMember(session.didKey, input.agencyId);
      const service = await prisma.agencyService.create({
        data: {
          agencyId: input.agencyId,
          name: input.name,
          description: input.description,
          requirementMode: input.requirementMode,
        },
      });
      const txHash = await contractService.logAgencyServiceCreated(
        input.agencyId,
        service.id,
        service.name,
      );
      res.json({ service, txHash });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/agency/services/:serviceId/workflow",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as { didKey: string };
        const input = z
          .object({
            steps: z
              .array(
                z.object({
                  stepNumber: z.number().int().positive(),
                  role: z.enum(["VERIFIER", "SIGNER", "ISSUER"]),
                  memberId: z.string().min(1),
                }),
              )
              .min(1),
          })
          .parse(req.body);
        const service = await prisma.agencyService.findUniqueOrThrow({
          where: { id: String(req.params.serviceId) },
        });
        await requireAgencyAdminMember(session.didKey, service.agencyId);
        const members = await prisma.agencyMember.findMany({
          where: {
            id: { in: input.steps.map((step) => step.memberId) },
            agencyId: service.agencyId,
            status: "ACTIVE",
          },
        });
        if (
          members.length !==
          new Set(input.steps.map((step) => step.memberId)).size
        ) {
          res.status(400).json({
            error: "All workflow members must be active members of this agency",
          });
          return;
        }

        await prisma.agencyServiceWorkflowStep.deleteMany({
          where: { serviceId: service.id },
        });
        const workflowSteps = await Promise.all(
          input.steps
            .sort((a, b) => a.stepNumber - b.stepNumber)
            .map((step) =>
              prisma.agencyServiceWorkflowStep.create({
                data: {
                  serviceId: service.id,
                  stepNumber: step.stepNumber,
                  role: step.role,
                  memberId: step.memberId,
                },
              }),
            ),
        );
        const txHash = await contractService.logAgencyWorkflowConfigured(
          service.agencyId,
          service.id,
          JSON.stringify(input.steps),
        );
        res.json({ workflowSteps, txHash });
      } catch (error) {
        next(error);
      }
    },
  );

  app.delete(
    "/agency/services/:serviceId",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as { didKey: string };
        const service = await prisma.agencyService.findUniqueOrThrow({
          where: { id: String(req.params.serviceId) },
        });
        await requireAgencyAdminMember(session.didKey, service.agencyId);
        const updated = await prisma.agencyService.update({
          where: { id: service.id },
          data: { active: false },
        });
        res.json({ service: updated });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/services", async (_req, res, next) => {
    try {
      const services = await prisma.agencyService.findMany({
        where: { active: true, agency: { status: { not: "DELETED" } } },
        include: {
          agency: true,
          workflowSteps: { orderBy: { stepNumber: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ services });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/services/:serviceId/requests",
    requireSession,
    upload.single("file"),
    async (req, res, next) => {
      try {
        const session = res.locals.session as {
          didKey: string;
          cidHash?: string;
          fullName?: string;
        };
        const service = await prisma.agencyService.findUniqueOrThrow({
          where: { id: String(req.params.serviceId) },
          include: {
            agency: true,
            workflowSteps: {
              include: { member: true },
              orderBy: { stepNumber: "asc" },
            },
          },
        });
        if (!service.active) {
          res.status(400).json({ error: "Service is not active" });
          return;
        }
        if (service.workflowSteps.length === 0) {
          res.status(400).json({ error: "Service has no configured workflow" });
          return;
        }
        const metadataJson =
          typeof req.body.metadataJson === "string"
            ? req.body.metadataJson
            : "{}";
        const citizenEmail =
          typeof req.body.citizenEmail === "string" && req.body.citizenEmail
            ? req.body.citizenEmail
            : undefined;
        const { user } = await ensureOnboarded(session.didKey, {
          cidHash: session.cidHash,
          fullName: session.fullName,
        });

        let document: Awaited<
          ReturnType<typeof prisma.document.create>
        > | null = null;
        let docHash: `0x${string}` | null = null;
        let citizenSignatureHash: string | null = null;
        if (service.requirementMode === "DOCUMENT_REQUIRED") {
          ensurePdfUpload(req.file);
          const uploaded = await pinataService.uploadFile(req.file!);
          docHash = computeDocumentHash(req.file!.buffer);
          const txHash = await contractService.registerDocument(
            docHash,
            user.privyWalletAddress as `0x${string}`,
            uploaded.cid,
          );
          document = await prisma.document.create({
            data: {
              ipfsCid: uploaded.cid,
              fileName: req.file!.originalname,
              mimeType: req.file!.mimetype,
              docHash,
              ownerDid: session.didKey,
              ownerWallet: user.privyWalletAddress,
              txHash,
            },
          });
          const { signature } = await signDocumentForDid(
            session.didKey,
            docHash,
            ZERO_SIGNATURE_HASH,
            {
              cidHash: session.cidHash,
              fullName: session.fullName,
            },
          );
          citizenSignatureHash = signature.signatureHash;
        }

        let request = await prisma.agencyServiceRequest.create({
          data: {
            token: randomUUID(),
            serviceId: service.id,
            citizenDid: session.didKey,
            citizenEmail,
            metadataJson,
            documentId: document?.id,
            docHash,
            citizenSignatureHash,
            latestSignatureHash: citizenSignatureHash,
          },
        });
        if (!request.docHash) {
          request = await prisma.agencyServiceRequest.update({
            where: { id: request.id },
            data: { docHash: computeTextHash(`agency-request:${request.id}`) },
          });
        }

        const steps = await Promise.all(
          service.workflowSteps.map((step) =>
            prisma.agencyRequestStep.create({
              data: {
                requestId: request.id,
                stepNumber: step.stepNumber,
                role: step.role,
                memberId: step.memberId,
                actionToken: randomUUID(),
              },
              include: {
                member: true,
                request: {
                  include: { service: { include: { agency: true } } },
                },
              },
            }),
          ),
        );
        const firstStep = firstPendingStep(steps);
        if (firstStep) {
          const expanded = steps.find(
            (step) => step.stepNumber === firstStep.stepNumber,
          );
          if (expanded) await emailNextAgencyStep(expanded);
        }
        res.json({ request, steps });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/agency/requests/:token", async (req, res, next) => {
    try {
      const step = await prisma.agencyRequestStep.findUnique({
        where: { actionToken: String(req.params.token) },
        include: {
          member: true,
          request: {
            include: {
              service: { include: { agency: true } },
              document: true,
              citizen: true,
              certificate: { include: { document: true } },
              steps: {
                include: { member: true },
                orderBy: { stepNumber: "asc" },
              },
            },
          },
        },
      });
      if (!step) {
        res.status(404).json({ error: "Agency request action not found" });
        return;
      }
      res.json({
        step,
        document: step.request.document
          ? toPublicDocument(step.request.document)
          : null,
        certificate: step.request.certificate?.document
          ? toPublicDocument(step.request.certificate.document)
          : null,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/agency/requests/:token/approve",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as {
          didKey: string;
          cidHash?: string;
          fullName?: string;
        };
        const step = await authorizeAgencyStep(
          String(req.params.token),
          session,
        );
        if (step.role === "ISSUER") {
          res
            .status(400)
            .json({ error: "Issuer steps must use the issue endpoint" });
          return;
        }
        let signatureHash: string | undefined;
        let txHash: string | undefined;
        if (step.role === "SIGNER") {
          if (!step.request.docHash)
            throw new Error("Request does not have a signable hash");
          const previousSignatureHash =
            step.request.latestSignatureHash ||
            step.request.citizenSignatureHash ||
            ZERO_SIGNATURE_HASH;
          const { signature } = await signDocumentForDid(
            session.didKey,
            step.request.docHash,
            previousSignatureHash,
            {
              cidHash: session.cidHash,
              fullName: session.fullName,
            },
          );
          signatureHash = signature.signatureHash;
          txHash = signature.txHash;
          await prisma.agencyServiceRequest.update({
            where: { id: step.requestId },
            data: { latestSignatureHash: signature.signatureHash },
          });
        }

        const updatedStep = await prisma.agencyRequestStep.update({
          where: { id: step.id },
          data: {
            status: "COMPLETED",
            signatureHash,
            txHash,
            actedAt: new Date(),
          },
        });
        const nextStep = await completeAgencyStep(step.requestId);
        await emailCitizenAgencyUpdate({
          citizenEmail: step.request.citizenEmail,
          agencyName: step.request.service.agency.name,
          serviceName: step.request.service.name,
          role: step.role,
          status: nextStep ? "STEP_COMPLETED" : "COMPLETED",
          verificationLink: signatureHash
            ? `${config.frontendOrigin}/verify/${signatureHash}`
            : undefined,
        });
        res.json({ step: updatedStep });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/agency/requests/:token/reject",
    requireSession,
    async (req, res, next) => {
      try {
        const session = res.locals.session as {
          didKey: string;
          cidHash?: string;
        };
        const input = z.object({ reason: z.string().min(1) }).parse(req.body);
        const step = await authorizeAgencyStep(
          String(req.params.token),
          session,
        );
        const [updatedStep, request] = await Promise.all([
          prisma.agencyRequestStep.update({
            where: { id: step.id },
            data: {
              status: "REJECTED",
              reason: input.reason,
              actedAt: new Date(),
            },
          }),
          prisma.agencyServiceRequest.update({
            where: { id: step.requestId },
            data: { status: "REJECTED" },
            include: { service: true },
          }),
        ]);
        if (request.citizenEmail) {
          await emailCitizenAgencyUpdate({
            citizenEmail: request.citizenEmail,
            agencyName: step.request.service.agency.name,
            serviceName: request.service.name,
            role: step.role,
            status: "REJECTED",
            reason: input.reason,
          });
        }
        res.json({ step: updatedStep, request });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/agency/requests/:token/issue",
    requireSession,
    upload.single("file"),
    async (req, res, next) => {
      try {
        const session = res.locals.session as {
          didKey: string;
          cidHash?: string;
          fullName?: string;
        };
        ensurePdfUpload(req.file);
        const step = await authorizeAgencyStep(
          String(req.params.token),
          session,
          "ISSUER",
        );
        const { user } = await ensureOnboarded(session.didKey, {
          cidHash: session.cidHash,
          fullName: session.fullName,
        });
        const uploaded = await pinataService.uploadFile(req.file!);
        const certificateDocHash = computeDocumentHash(req.file!.buffer);
        const registerTxHash = await contractService.registerDocument(
          certificateDocHash,
          user.privyWalletAddress as `0x${string}`,
          uploaded.cid,
        );
        const document = await prisma.document.create({
          data: {
            ipfsCid: uploaded.cid,
            fileName: req.file!.originalname,
            mimeType: req.file!.mimetype,
            docHash: certificateDocHash,
            ownerDid: session.didKey,
            ownerWallet: user.privyWalletAddress,
            txHash: registerTxHash,
          },
        });
        if (!step.request.docHash) {
          throw new Error("Request does not have a signable hash");
        }
        const previousSignatureHash =
          step.request.latestSignatureHash ||
          step.request.citizenSignatureHash ||
          ZERO_SIGNATURE_HASH;
        const { signature } = await signDocumentForDid(
          session.didKey,
          step.request.docHash,
          previousSignatureHash,
          {
            cidHash: session.cidHash,
            fullName: session.fullName,
          },
        );
        const certificateUrl = ipfsGatewayUrl(uploaded.cid);
        const issued = await ndiService.issueCredential({
          holderDID: step.request.citizenDid,
          credentialData: {
            "Institution Name": step.request.service.agency.name,
            "Degree Name": step.request.service.name,
            "Graduation Date": new Date().toISOString().slice(0, 10),
            "Certificate URL": certificateUrl,
          },
        });
        const [certificate, updatedStep, request] = await Promise.all([
          prisma.agencyIssuedCertificate.create({
            data: {
              requestId: step.requestId,
              documentId: document.id,
              signatureHash: signature.signatureHash,
              credentialStatus: "OFFER_CREATED",
              credInviteUrl: issued.credInviteURL,
              deepLinkUrl: issued.deepLinkURL,
              issueCredThreadId: issued.issueCredThreadId,
              relationshipDid: issued.relationshipDid,
              revocationId: issued.revocationId,
            },
          }),
          prisma.agencyRequestStep.update({
            where: { id: step.id },
            data: {
              status: "COMPLETED",
              signatureHash: signature.signatureHash,
              txHash: signature.txHash,
              actedAt: new Date(),
            },
          }),
          prisma.agencyServiceRequest.update({
            where: { id: step.requestId },
            data: { latestSignatureHash: signature.signatureHash },
            include: { service: true },
          }),
        ]);
        const nextStep = await completeAgencyStep(step.requestId);
        if (request.citizenEmail) {
          if (nextStep) {
            await emailCitizenAgencyUpdate({
              citizenEmail: request.citizenEmail,
              agencyName: step.request.service.agency.name,
              serviceName: request.service.name,
              role: step.role,
              status: "STEP_COMPLETED",
              verificationLink: `${config.frontendOrigin}/verify/${signature.signatureHash}`,
            });
          } else {
            await emailService.sendAgencyRequestCompleted({
              to: request.citizenEmail,
              serviceName: request.service.name,
              verificationLink: `${config.frontendOrigin}/verify/${signature.signatureHash}`,
              certificateUrl,
            });
          }
        }
        res.json({
          certificate,
          step: updatedStep,
          certificateUrl,
          verificationLink: `${config.frontendOrigin}/verify/${signature.signatureHash}`,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/history", requireSession, async (_req, res, next) => {
    try {
      const session = res.locals.session as {
        didKey: string;
        cidHash?: string;
      };
      const user = await prisma.user.findUnique({
        where: { didKey: session.didKey },
      });
      const cidHash = session.cidHash || user?.cidHash;
      const [
        documents,
        signatures,
        sentRequests,
        receivedRequests,
        agencyRequests,
      ] = await Promise.all([
        prisma.document.findMany({
          where: { ownerDid: session.didKey },
          orderBy: { createdAt: "desc" },
        }),
        prisma.signature.findMany({
          where: { signerDid: session.didKey },
          orderBy: { createdAt: "desc" },
        }),
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
        prisma.agencyServiceRequest.findMany({
          where: { citizenDid: session.didKey },
          include: {
            service: { include: { agency: true } },
            document: true,
            certificate: { include: { document: true } },
            steps: {
              include: { member: true },
              orderBy: { stepNumber: "asc" },
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      const signatureCounts = await prisma.signature.groupBy({
        by: ["docHash"],
        where: {
          docHash: { in: documents.map((document) => document.docHash) },
        },
        _count: { docHash: true },
      });
      const signatureCountByDoc = new Map(
        signatureCounts.map((item) => [item.docHash, item._count.docHash]),
      );

      res.json({
        user: user
          ? {
              didKey: user.didKey,
              privyWalletAddress: user.privyWalletAddress,
              cidHash: user.cidHash,
              fullName: user.fullName,
            }
          : null,
        documents: documents.map((document) => ({
          ...toPublicDocument(document),
          signatureCount: signatureCountByDoc.get(document.docHash) || 0,
        })),
        signatures: signatures.map(toPublicSignature),
        sentRequests: sentRequests.map((request) =>
          toPublicPeerRequest(request, request.document),
        ),
        receivedRequests: receivedRequests.map((request) =>
          toPublicPeerRequest(request, request.document),
        ),
        agencyRequests: agencyRequests.map((request) => ({
          ...request,
          document: request.document
            ? toPublicDocument(request.document)
            : null,
          certificate: request.certificate?.document
            ? toPublicDocument(request.certificate.document)
            : null,
          verificationLink: request.latestSignatureHash
            ? `${config.frontendOrigin}/verify/${request.latestSignatureHash}`
            : null,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/verify/document/:docHash", async (req, res, next) => {
    try {
      const docHash = hex32.parse(req.params.docHash);
      const [document, signatures] = await Promise.all([
        prisma.document.findFirst({
          where: { docHash },
          orderBy: { createdAt: "desc" },
        }),
        prisma.signature.findMany({
          where: { docHash },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      res.json({
        docHash,
        document: document ? toPublicDocument(document) : null,
        signatureCount: signatures.length,
        signatures: signatures.map((signature) => ({
          ...toPublicSignature(signature),
          verificationLink: `${config.frontendOrigin}/verify/${signature.signatureHash}`,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/verify/:signatureHash", async (req, res, next) => {
    try {
      const signature = await prisma.signature.findUnique({
        where: { signatureHash: req.params.signatureHash },
      });
      if (!signature) {
        res.status(404).json({ error: "Signature not found" });
        return;
      }

      const document = await prisma.document.findFirst({
        where: { docHash: signature.docHash },
        orderBy: { createdAt: "desc" },
      });
      const { chain, brokenAt } = await buildSignatureChain(
        signature.signatureHash,
      );
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

  app.get(
    "/verify/:signatureHash/signer",
    requireSession,
    async (req, res, next) => {
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
          res
            .status(404)
            .json({ error: "NDI identity is not onboarded in BondChain" });
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
    },
  );

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation failed", issues: error.issues });
        return;
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    },
  );

  return app;
};
