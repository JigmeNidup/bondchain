import {
  PrivyClient,
  generateAuthorizationSignature,
  type WalletApiRequestSignatureInput,
} from "@privy-io/node";
import { createPrivateKey } from "crypto";
import { keccak256, toBytes, type Hex } from "viem";
import { getConfig } from "../config.js";

const isHex = (value: string): value is Hex => /^0x[0-9a-fA-F]*$/.test(value);

const normalizeAuthorizationPrivateKey = (privateKey: string) => {
  const trimmed = privateKey.trim().replace(/\\n/g, "\n");
  if (!trimmed.includes("BEGIN")) return trimmed;

  const keyObject = createPrivateKey(trimmed);
  return Buffer.from(keyObject.export({ format: "der", type: "pkcs8" })).toString("base64");
};

export class PrivyWalletService {
  private client() {
    const config = getConfig();
    return new PrivyClient({ appId: config.privy.appId, appSecret: config.privy.appSecret });
  }

  async createWallet() {
    const config = getConfig();
    const client = this.client() as any;
    const wallet = await client.wallets().create({
      chain_type: "ethereum",
      owner: { public_key: config.privy.authorizationPublicKey },
    });

    return {
      id: String(wallet.id),
      address: String(wallet.address),
    };
  }

  async signDocumentHash(walletId: string, docHash: string) {
    const config = getConfig();
    const body = {
      method: "personal_sign",
      params: {
        message: docHash,
        encoding: "utf-8",
      },
    };
    const input: WalletApiRequestSignatureInput = {
      version: 1,
      url: `https://api.privy.io/v1/wallets/${walletId}/rpc`,
      method: "POST",
      headers: { "privy-app-id": config.privy.appId },
      body,
    };
    const authorizationSignature = await Promise.resolve(
      generateAuthorizationSignature({
        input,
        authorizationPrivateKey: normalizeAuthorizationPrivateKey(config.privy.authorizationPrivateKey),
      }),
    );

    const response = await fetch(input.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${config.privy.appId}:${config.privy.appSecret}`).toString("base64")}`,
        "privy-app-id": config.privy.appId,
        "privy-authorization-signature": authorizationSignature,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Privy signing failed: ${response.status} ${await response.text()}`);

    const result = await response.json();
    const signature = String(result.signature || result.data?.signature);
    const signatureHash = isHex(signature) ? keccak256(signature) : keccak256(toBytes(signature));

    return { signature, signatureHash };
  }
}

export const privyWalletService = new PrivyWalletService();
