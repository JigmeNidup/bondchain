ALTER TABLE "Signature" ADD COLUMN "signerWalletHash" TEXT;

UPDATE "Signature"
SET "signerWalletHash" = "signerWallet"
WHERE "signerWalletHash" IS NULL;

ALTER TABLE "Signature" ALTER COLUMN "signerWalletHash" SET NOT NULL;
