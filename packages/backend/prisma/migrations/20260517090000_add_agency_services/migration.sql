-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "adminEmail" TEXT NOT NULL,
    "adminCidHash" TEXT NOT NULL,
    "adminDid" TEXT,
    "createdByDid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyInvitation" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cidHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedByDid" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyMember" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "didKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cidHash" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyOfficerInvitation" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cidHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedByDid" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyOfficerInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyService" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requirementMode" TEXT NOT NULL DEFAULT 'DOCUMENT_REQUIRED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgencyService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyServiceWorkflowStep" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyServiceWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyServiceRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "citizenDid" TEXT NOT NULL,
    "citizenEmail" TEXT,
    "metadataJson" TEXT NOT NULL,
    "documentId" TEXT,
    "docHash" TEXT,
    "citizenSignatureHash" TEXT,
    "latestSignatureHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentStepNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AgencyServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyRequestStep" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "actionToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signatureHash" TEXT,
    "txHash" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actedAt" TIMESTAMP(3),
    CONSTRAINT "AgencyRequestStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyIssuedCertificate" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signatureHash" TEXT,
    "credentialStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "credInviteUrl" TEXT,
    "deepLinkUrl" TEXT,
    "issueCredThreadId" TEXT,
    "relationshipDid" TEXT,
    "revocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyIssuedCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agency_status_idx" ON "Agency"("status");
CREATE UNIQUE INDEX "AgencyInvitation_token_key" ON "AgencyInvitation"("token");
CREATE INDEX "AgencyInvitation_agencyId_idx" ON "AgencyInvitation"("agencyId");
CREATE UNIQUE INDEX "AgencyMember_agencyId_didKey_key" ON "AgencyMember"("agencyId", "didKey");
CREATE INDEX "AgencyMember_didKey_idx" ON "AgencyMember"("didKey");
CREATE INDEX "AgencyMember_agencyId_role_idx" ON "AgencyMember"("agencyId", "role");
CREATE UNIQUE INDEX "AgencyOfficerInvitation_token_key" ON "AgencyOfficerInvitation"("token");
CREATE INDEX "AgencyOfficerInvitation_agencyId_idx" ON "AgencyOfficerInvitation"("agencyId");
CREATE INDEX "AgencyService_agencyId_idx" ON "AgencyService"("agencyId");
CREATE INDEX "AgencyService_active_idx" ON "AgencyService"("active");
CREATE UNIQUE INDEX "AgencyServiceWorkflowStep_serviceId_stepNumber_key" ON "AgencyServiceWorkflowStep"("serviceId", "stepNumber");
CREATE INDEX "AgencyServiceWorkflowStep_memberId_idx" ON "AgencyServiceWorkflowStep"("memberId");
CREATE UNIQUE INDEX "AgencyServiceRequest_token_key" ON "AgencyServiceRequest"("token");
CREATE INDEX "AgencyServiceRequest_serviceId_idx" ON "AgencyServiceRequest"("serviceId");
CREATE INDEX "AgencyServiceRequest_citizenDid_idx" ON "AgencyServiceRequest"("citizenDid");
CREATE INDEX "AgencyServiceRequest_status_idx" ON "AgencyServiceRequest"("status");
CREATE UNIQUE INDEX "AgencyRequestStep_actionToken_key" ON "AgencyRequestStep"("actionToken");
CREATE UNIQUE INDEX "AgencyRequestStep_requestId_stepNumber_key" ON "AgencyRequestStep"("requestId", "stepNumber");
CREATE INDEX "AgencyRequestStep_memberId_idx" ON "AgencyRequestStep"("memberId");
CREATE INDEX "AgencyRequestStep_requestId_status_idx" ON "AgencyRequestStep"("requestId", "status");
CREATE UNIQUE INDEX "AgencyIssuedCertificate_requestId_key" ON "AgencyIssuedCertificate"("requestId");

-- AddForeignKey
ALTER TABLE "AgencyInvitation" ADD CONSTRAINT "AgencyInvitation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyService" ADD CONSTRAINT "AgencyService_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyServiceWorkflowStep" ADD CONSTRAINT "AgencyServiceWorkflowStep_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AgencyService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyServiceWorkflowStep" ADD CONSTRAINT "AgencyServiceWorkflowStep_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "AgencyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyServiceRequest" ADD CONSTRAINT "AgencyServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AgencyService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyServiceRequest" ADD CONSTRAINT "AgencyServiceRequest_citizenDid_fkey" FOREIGN KEY ("citizenDid") REFERENCES "User"("didKey") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyServiceRequest" ADD CONSTRAINT "AgencyServiceRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgencyRequestStep" ADD CONSTRAINT "AgencyRequestStep_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AgencyServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyRequestStep" ADD CONSTRAINT "AgencyRequestStep_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "AgencyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyIssuedCertificate" ADD CONSTRAINT "AgencyIssuedCertificate_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AgencyServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgencyIssuedCertificate" ADD CONSTRAINT "AgencyIssuedCertificate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
