ALTER TABLE "PeerSigningRequest" ADD COLUMN "documentId" TEXT;

UPDATE "PeerSigningRequest"
SET "documentId" = "Document"."id"
FROM "Document"
WHERE "PeerSigningRequest"."docHash" = "Document"."docHash";

ALTER TABLE "PeerSigningRequest" ALTER COLUMN "documentId" SET NOT NULL;

ALTER TABLE "PeerSigningRequest" DROP CONSTRAINT IF EXISTS "PeerSigningRequest_docHash_fkey";
ALTER TABLE "Workflow" DROP CONSTRAINT IF EXISTS "Workflow_docHash_fkey";

DROP INDEX IF EXISTS "Document_docHash_key";
CREATE INDEX IF NOT EXISTS "Document_docHash_idx" ON "Document"("docHash");
CREATE INDEX IF NOT EXISTS "PeerSigningRequest_documentId_idx" ON "PeerSigningRequest"("documentId");

ALTER TABLE "PeerSigningRequest" ADD CONSTRAINT "PeerSigningRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
