ALTER TABLE "User" ADD COLUMN "cidHash" TEXT;
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;

ALTER TABLE "Document" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Document" ADD COLUMN "mimeType" TEXT;

CREATE TABLE "PeerSigningRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "requesterDid" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "targetEmail" TEXT NOT NULL,
    "targetCidHash" TEXT NOT NULL,
    "requesterSignatureHash" TEXT NOT NULL,
    "targetSignatureHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "PeerSigningRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PeerSigningRequest_token_key" ON "PeerSigningRequest"("token");
CREATE INDEX "PeerSigningRequest_requesterDid_idx" ON "PeerSigningRequest"("requesterDid");
CREATE INDEX "PeerSigningRequest_targetCidHash_idx" ON "PeerSigningRequest"("targetCidHash");
CREATE INDEX "PeerSigningRequest_docHash_idx" ON "PeerSigningRequest"("docHash");

ALTER TABLE "PeerSigningRequest" ADD CONSTRAINT "PeerSigningRequest_docHash_fkey" FOREIGN KEY ("docHash") REFERENCES "Document"("docHash") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PeerSigningRequest" ADD CONSTRAINT "PeerSigningRequest_requesterDid_fkey" FOREIGN KEY ("requesterDid") REFERENCES "User"("didKey") ON DELETE RESTRICT ON UPDATE CASCADE;
