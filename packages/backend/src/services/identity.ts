import { createHash } from "crypto";

export const normalizeCid = (cid: string) => cid.replace(/\D/g, "");

export const hashCid = (cid: string) => {
  const normalized = normalizeCid(cid);
  if (!normalized) throw new Error("CID must include at least one digit");
  return createHash("sha256").update(normalized).digest("hex");
};

export const cidHashFromAttributes = (attributes: Record<string, string>) => {
  const idNumber = attributes["ID Number"] || attributes["ID number"] || attributes.idNumber || attributes.cid;
  if (!idNumber) return undefined;
  return hashCid(idNumber);
};
