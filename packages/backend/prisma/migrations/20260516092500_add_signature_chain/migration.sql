ALTER TABLE "Signature" ADD COLUMN "payloadHash" TEXT;
ALTER TABLE "Signature" ADD COLUMN "previousSignatureHash" TEXT;

UPDATE "Signature"
SET
  "payloadHash" = "signatureHash",
  "previousSignatureHash" = '0x0000000000000000000000000000000000000000000000000000000000000000'
WHERE "payloadHash" IS NULL OR "previousSignatureHash" IS NULL;

ALTER TABLE "Signature" ALTER COLUMN "payloadHash" SET NOT NULL;
ALTER TABLE "Signature" ALTER COLUMN "previousSignatureHash" SET NOT NULL;

ALTER TABLE "Signature" DROP COLUMN IF EXISTS "step";
ALTER TABLE "SigningSession" ADD COLUMN "previousSignatureHash" TEXT;
ALTER TABLE "SigningSession" DROP COLUMN IF EXISTS "signerRole";
