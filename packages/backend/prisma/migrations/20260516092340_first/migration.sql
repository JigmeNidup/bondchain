-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "didKey" TEXT NOT NULL,
    "privyWalletId" TEXT NOT NULL,
    "privyWalletAddress" TEXT NOT NULL,
    "linkageHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ipfsCid" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "ownerDid" TEXT NOT NULL,
    "ownerWallet" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "signerDid" TEXT NOT NULL,
    "signerWallet" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "step" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "serviceId" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdByDid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "signerDid" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "txHash" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SigningSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "documentName" TEXT,
    "callbackUrl" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signatureHash" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SigningSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_didKey_key" ON "User"("didKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_linkageHash_key" ON "User"("linkageHash");

-- CreateIndex
CREATE UNIQUE INDEX "Document_docHash_key" ON "Document"("docHash");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_signatureHash_key" ON "Signature"("signatureHash");

-- CreateIndex
CREATE UNIQUE INDEX "SigningSession_token_key" ON "SigningSession"("token");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerDid_fkey" FOREIGN KEY ("ownerDid") REFERENCES "User"("didKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_signerDid_fkey" FOREIGN KEY ("signerDid") REFERENCES "User"("didKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_docHash_fkey" FOREIGN KEY ("docHash") REFERENCES "Document"("docHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
