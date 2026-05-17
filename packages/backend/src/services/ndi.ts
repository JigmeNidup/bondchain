import { connect, nkeyAuthenticator, StringCodec } from "nats";
import { getConfig } from "../config.js";

type NDIAuthToken = {
  accessToken: string;
  expiresAt: number;
};

type NDIProofResult = {
  threadId: string;
  validated: boolean;
  holderDid?: string;
  revealedAttributes: Record<string, string>;
  raw: unknown;
};

let tokenCache: NDIAuthToken | null = null;
const proofResults = new Map<string, NDIProofResult>();
const sc = StringCodec();

const unwrap = (payload: unknown): any => {
  const value = payload as any;
  return value?.data || value;
};

const attrValue = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && typeof raw === "object" && "value" in raw) return String((raw as { value: unknown }).value);
  return raw == null ? "" : String(raw);
};

const normalizeProofResult = (subject: string, payload: unknown): NDIProofResult | null => {
  const inner = unwrap(payload);
  if (!inner || inner.type !== "present-proof/presentation-result") return null;

  const revealed = inner.requested_presentation?.revealed_attrs || {};
  const revealedAttributes = Object.fromEntries(
    Object.entries(revealed).map(([name, value]) => [name, attrValue(value)]),
  );
  const threadId = inner.proofRequestThreadId || inner.threadId || inner.thid || inner._thread?.thid || subject;
  const holderDid = inner.holder_did || inner.holderDid || inner.requested_presentation?.identifiers?.[0]?.holder_did;

  return {
    threadId,
    validated: inner.verification_result === "ProofValidated",
    holderDid,
    revealedAttributes,
    raw: payload,
  };
};

export class NDIService {
  async authenticate() {
    const config = getConfig();
    if (tokenCache && tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) return tokenCache.accessToken;

    const body = new URLSearchParams({
      client_id: config.ndi.clientId,
      client_secret: config.ndi.clientSecret,
      grant_type: "client_credentials",
    });

    const response = await fetch(`${config.ndi.authBase}/authentication/v1/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error(`NDI auth failed: ${response.status} ${await response.text()}`);

    const data = (await response.json()) as { access_token: string; expires_in: number };
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return tokenCache.accessToken;
  }

  async createLoginProofRequest() {
    const config = getConfig();
    const token = await this.authenticate();
    const response = await fetch(`${config.ndi.apiBase}/verifier/v1/proof-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proofName: "BondChain login",
        proofAttributes: [
          {
            name: "ID Number",
            restrictions: [{ schema_name: config.ndi.foundationalSchema }],
          },
          {
            name: "Full Name",
            restrictions: [{ schema_name: config.ndi.foundationalSchema }],
          },
        ],
        purpose: "login",
        authenticationLevel: "Standard",
        isShortenUrl: true,
      }),
    });

    if (!response.ok) throw new Error(`NDI proof request failed: ${response.status} ${await response.text()}`);
    const body = await response.json();
    return body.data;
  }

  async issueCredential(input: {
    holderDID: string;
    credentialData: Record<string, string | number>;
    schemaId?: string;
  }) {
    const config = getConfig();
    const token = await this.authenticate();
    const response = await fetch(`${config.ndi.apiBase}/issuer/v1/issue-credential`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credentialData: input.credentialData,
        schemaId: input.schemaId || config.ndi.issuerSchemaId,
        holderDID: input.holderDID,
      }),
    });

    if (!response.ok) throw new Error(`NDI credential issuance failed: ${response.status} ${await response.text()}`);
    const body = await response.json();
    return body.data as {
      credInviteURL?: string;
      deepLinkURL?: string;
      issueCredThreadId?: string;
      relationshipDid?: string;
      revocationId?: string;
    };
  }

  getProofResult(threadId: string) {
    return proofResults.get(threadId) || null;
  }

  async startSubscriber() {
    const config = getConfig();
    const nc = await connect({
      servers: [config.ndi.natsWss],
      authenticator: nkeyAuthenticator(new TextEncoder().encode(config.ndi.nkeySeed)),
    });

    const sub = nc.subscribe(">");
    void (async () => {
      for await (const msg of sub) {
        try {
          const payload = JSON.parse(sc.decode(msg.data));
          const result = normalizeProofResult(msg.subject, payload);
          if (result) proofResults.set(result.threadId, result);
        } catch (error) {
          console.error("Failed to parse NDI NATS message", error);
        }
      }
    })();

    return nc;
  }
}

export const ndiService = new NDIService();
