# BondChain - AI Agent Build Context

> This file is the source of truth for building the BondChain DApp. Agents should read it before changing code. The implementation lives in `/home/jinux/hackathon/bondchain`.

---

## 1. What We Are Building

BondChain is a blockchain-powered document signing and verification platform. Citizens, foreign guests, and organizations can sign, trace, and verify documents digitally without visiting offices or depending on a central authority for the audit trail.

BondChain is also an embeddable signing API service, similar to an OAuth redirect flow. External agency applications can send a user to BondChain for NDI-gated document signing without managing NDI, wallets, private keys, Privy, or contract writes themselves.

Current companion docs:

- `bondchain/API.md` - external signing API integration guide
- `bondchain/Onboarding.md` - current NDI + Privy onboarding implementation

---

## 2. Core Principle: Who Does What

| Layer | Technology | Responsibility |
|---|---|---|
| Identity and Authentication | Bhutan NDI | User login, proof request, DID key extraction, session gating |
| Document Signing | Privy server wallets | Cryptographic signing after a valid NDI session |
| Immutability and Audit | Ethereum Sepolia | Tamper-proof document, identity, and signature records |
| Document Storage | IPFS via Pinata | Content-addressed document storage |
| Frontend | Next.js / Scaffold-ETH 2 | Onboarding, signing overlay, verification UI |
| Backend | Express.js | NDI auth, Privy wallet/signing, Pinata upload, contract relayer |
| Database | PostgreSQL + Prisma | DID-to-wallet mapping, signing sessions, peer requests, signature chain records |

NDI is never used for signing. NDI is only used for identity verification and session gating.

Privy server wallets perform all cryptographic signing, but only after a valid NDI-backed BondChain session exists.

---

## 3. Users and Roles

| Role | Description |
|---|---|
| Citizen | Person with a Bhutan CID who submits or signs documents |
| Foreign Guest | Non-citizen who submits document proofs where supported |
| Organization Signer | Employee who signs as part of an agency workflow |
| Agency Officer | Agency employee invited by an agency admin and assigned to verifier, signer, or issuer workflow steps |
| Agency Admin | Invited by the platform admin; configures agency services, officers, and workflows inside BondChain |
| Platform Admin | Operates BondChain deployments, enrolls agencies, and is authorized by DID allowlist |

Roles may exist in an external workflow system, but BondChain does not include role or step labels in the cryptographic payload, public signature record, or verification UI.

---

## 4. User Onboarding

Onboarding happens once per user. It binds one Bhutan NDI identity to one Privy-controlled Ethereum wallet.

### Flow

1. User opens `/onboard`.
2. Frontend calls `POST /auth/ndi/initiate`.
3. Backend authenticates with Bhutan NDI and creates a login proof request.
4. Frontend displays the NDI QR code and mobile deep link.
5. User approves the proof in the NDI Wallet.
6. NDI publishes the proof result through NATS.
7. Frontend polls `GET /auth/ndi/status/:threadId`.
8. Backend extracts `holderDid` / `did:key` from the proof result.
9. Backend sets a short-lived `bondchain_session` cookie containing the DID.
10. User clicks the wallet binding action.
11. Frontend calls `POST /onboard`.
12. Backend creates or reuses a Privy Ethereum wallet for that DID.
13. Backend computes `linkageHash = keccak256(didKey + lowercaseWalletAddress)`.
14. Backend calls `IdentityRegistry.registerIdentity(linkageHash, walletAddress)`.
15. Backend stores the user row in PostgreSQL.

### Stored Binding

| Data | Location | Purpose |
|---|---|---|
| `didKey -> privyWalletId` | PostgreSQL `User` table | Privy wallet lookup |
| `didKey -> privyWalletAddress` | PostgreSQL `User` table | Runtime signing and signer verification |
| `cidHash = sha256(normalizedCID)` | PostgreSQL `User` table | Private user-to-user recipient matching |
| `linkageHash` | `IdentityRegistry` contract | Public proof of DID-to-wallet binding |

Anyone can recompute `keccak256(didKey + lowercaseWalletAddress)` and compare it to the on-chain `linkageHash` if the DID and wallet are intentionally revealed. Public document verification does not reveal raw signer wallet addresses by default.

---

## 5. User Signing

NDI login is the mandatory gate before the backend will invoke a Privy wallet.

### Flow

1. External app or BondChain UI creates a signing session for a `documentHash`.
2. User is redirected to `/sign?session=<token>`.
3. User completes NDI login if no valid `bondchain_session` exists.
4. Backend looks up the user's Privy wallet from the session DID.
5. Backend determines `previousSignatureHash`.
   - First signer: zero hash.
   - Later signer: previous callback's `signatureHash`.
6. Backend computes `payloadHash = keccak256(abi.encodePacked(documentHash, previousSignatureHash))`.
7. Privy signs `payloadHash`.
8. Backend computes `signatureHash = keccak256(signature)`.
9. Backend computes `signerWalletHash = keccak256(lowercaseWalletAddress)`.
10. Backend stores the signature in PostgreSQL and logs the public record on-chain.
11. Backend redirects back to the external app callback with `signature`, `signatureHash`, `txHash`, and `verificationLink`.

Raw signer wallet addresses are kept in the database for runtime DID lookups and are not written to the signature contract or shown in the public verifier.

---

## 6. User Flows

### 6a. User-to-User Document Signing

1. User A logs in with NDI and uploads a PDF at `/user-to-user`.
2. Backend stores the PDF on IPFS and computes/registers `documentHash`.
3. User A signs the document; signature 1 uses zero `previousSignatureHash`.
4. User A enters target signer CID, target email, and their own email.
5. Backend stores only `targetCidHash = sha256(normalizedCID)` and emails User B a signing link.
6. User B opens `/user-to-user/sign/:token`, previews the PDF from IPFS, and logs in with NDI.
7. Backend compares User B's NDI CID hash with `targetCidHash`.
8. If the hashes match, User B signs using User A's `signatureHash` as `previousSignatureHash`.
9. Backend emails User A the final verification link.
10. Verification of the final signature traces back to User A's signature.

### 6b. User-to-Agency Service Signing

BondChain now includes a first-party user-to-agency services module for the hackathon.

1. Platform admin logs in with NDI and is authorized by `PLATFORM_ADMIN_DID_KEYS`.
2. Platform admin enrolls an agency with agency name, agency admin email, and agency admin CID.
3. BondChain emails the agency admin an invitation link and logs the agency enrollment on-chain.
4. Agency admin opens the invitation, logs in with NDI, and must match the invited CID hash.
5. BondChain binds/reuses the admin's Privy wallet, marks the agency as registered, and logs agency admin registration on-chain using the agency admin wallet hash.
6. Agency admin creates services, configures whether each service is NDI-only or document-required, invites agency officers, and defines ordered workflow steps.
7. Agency officer invitations use email plus CID matching. Officers register with NDI before they can act.
8. Citizen logs in with NDI, selects a service, submits service metadata, and uploads PDF documents when the service requires documents.
9. Document-required submissions are uploaded to IPFS, registered on-chain, and signed by the citizen through the existing Privy signing flow.
10. BondChain routes the request through the configured agency workflow and emails each assigned officer in order.
11. Verifier steps approve/reject with private workflow metadata.
12. Signer steps Privy-sign the submitted document/request hash and chain from the previous signature when present.
13. Issuer steps upload a final certificate/document PDF, store it on IPFS, sign the existing service request/document hash using the current `latestSignatureHash`, and issue an NDI credential to the citizen with the certificate URL attached. Certificate issuance must continue the existing request signature chain; it must not start a new chain from the certificate PDF hash.
14. Citizen history shows request state, issued certificate links, and verification links.

Agency names, role labels, workflow steps, queue state, and service names remain application metadata. They are not included in the cryptographic signing payload, public signature contract record, or public verification chain.

External agency apps may still use the embeddable signing API directly. In that mode, the external app owns role names, queue state, review labels, and approval routing while BondChain owns the cryptographic chain and public verification record.

### 6c. Inside Agency Workflow - Notesheet

The Notesheet workflow is an agency-internal approval flow exposed through the BondChain embeddable signing API.

Normal external flow:

1. Requester submits a Notesheet document inside the agency app.
2. Agency app computes `documentHash`.
3. Agency app calls BondChain with `{ documentHash, callbackUrl, documentName }`.
4. BondChain returns a `redirectUrl`.
5. Agency app redirects the user to BondChain.
6. User completes NDI login.
7. User signs through their Privy server wallet.
8. BondChain redirects back to `callbackUrl` with the signature result.
9. Agency app stores `signatureHash`.
10. Reviewer repeats the flow with the same `documentHash` and requester's `signatureHash` as `previousSignatureHash`.
11. Approver repeats the flow with the reviewer's `signatureHash` as `previousSignatureHash`.
12. Verifying the approver signature shows the full chain back through reviewer and requester signatures.

BondChain does not store or display requester/reviewer/approver labels in the signing payload, signature record, or verification UI. The external agency app may keep those labels privately.

### BondChain Signing API - Step by Step

| Step | What Happens | Actor |
|---|---|---|
| 1 | External app calls `POST /api/signing/initiate` with `documentHash`, optional `previousSignatureHash`, `callbackUrl`, and optional `documentName` | External app server |
| 2 | BondChain returns `redirectUrl` | BondChain backend |
| 3 | External app sends user to `/sign?session=<token>` | User browser |
| 4 | User completes NDI login | User |
| 5 | Backend creates or validates session and retrieves Privy wallet | BondChain backend |
| 6 | User confirms signing | User |
| 7 | Backend signs `payloadHash`, logs on-chain, stores DB record | BondChain backend + Sepolia |
| 8 | BondChain redirects to `callbackUrl` with signature result | User browser |
| 9 | External app stores `signatureHash` for the next signer | External app server |

The external app never touches private keys, never manages wallets, and never calls NDI directly.

---

## 7. Cryptographic Signing Flow

### Linked Signature Chain

```text
Document (D)
  -> Hash(D) = documentHash
  -> previousSignatureHash = 0x00...00 for the first signer
  -> payloadHash1 = keccak256(documentHash + previousSignatureHash)
  -> Privy.sign(payloadHash1, signer1_wallet) = signature1
  -> signatureHash1 = keccak256(signature1)

  -> payloadHash2 = keccak256(documentHash + signatureHash1)
  -> Privy.sign(payloadHash2, signer2_wallet) = signature2
  -> signatureHash2 = keccak256(signature2)

  -> payloadHash3 = keccak256(documentHash + signatureHash2)
  -> Privy.sign(payloadHash3, signer3_wallet) = signature3
  -> signatureHash3 = keccak256(signature3)

Final verification URL: /verify/signatureHash3
```

The public verifier can trace from `signatureHash3` to `signatureHash2` to `signatureHash1` because each signature record stores its `previousSignatureHash`.

### Payload Rule

BondChain signs only:

```text
payloadHash = keccak256(abi.encodePacked(documentHash, previousSignatureHash))
```

No roles, steps, labels, workflow statuses, or UI text are included in the cryptographic payload or signature record.

### DID to Wallet Linkage

```text
NDI login -> did:key
  -> keccak256(didKey + lowercaseWalletAddress) = linkageHash
  -> linkageHash stored on IdentityRegistry
  -> didKey, privyWalletId, privyWalletAddress stored in PostgreSQL
```

### Signer Hash

```text
signerWalletHash = keccak256(lowercaseWalletAddress)
```

This hash is written on-chain and shown on the verifier page instead of the raw signer address.

---

## 8. What Goes Where

| Data | Storage | Reason |
|---|---|---|
| Document files | Public IPFS via Pinata | Content-addressed file storage; previews use configured Pinata dedicated gateway |
| Document hashes | Blockchain + PostgreSQL | Tamper-proof proof of existence and fast lookup |
| `payloadHash` | Blockchain + PostgreSQL | Proves what the Privy wallet signed |
| `previousSignatureHash` | Blockchain + PostgreSQL | Enables linked-list chain verification |
| Raw signature | PostgreSQL, callback response | Allows external apps and verifier API to inspect signing result |
| `signatureHash` | Blockchain + PostgreSQL | Public verification ID and chain pointer |
| `signerWalletHash` | Blockchain + PostgreSQL | Public signer commitment without revealing raw wallet |
| Raw signer wallet | PostgreSQL only | Runtime lookup for DID-linked signer verification |
| `linkageHash` | `IdentityRegistry` | Public proof of NDI-to-wallet binding |
| Privy wallet ID/address | PostgreSQL | Create/reuse wallet for a DID |
| Privy private keys | Privy | Never handled by BondChain |
| NDI proof results | Backend memory during login | Ephemeral login status and DID extraction |
| `bondchain_session` | HTTP-only short-lived cookie | NDI-gated session |
| Signing sessions | PostgreSQL | OAuth-style redirect state |
| Peer signing requests | PostgreSQL | User-to-user request state and email notification metadata |
| Target CID hash | PostgreSQL | Match target signer without storing raw CID |

---

## 9. Smart Contracts

Network: Ethereum Sepolia testnet.

Current implemented contracts are in `bondchain/packages/foundry/contracts`.

### `IdentityRegistry.sol`

- Stores `linkageHash = keccak256(didKey + lowercaseWalletAddress)` on onboarding.
- Allows public verification of an NDI-to-wallet binding hash.
- Main function: `registerIdentity(bytes32 linkageHash, address walletAddress)`.
- Event: identity binding with linkage hash, wallet address, and timestamp.

### `DocumentRegistry.sol`

- Registers document hashes and ownership.
- Main functions: `registerDocument(bytes32 docHash, string ipfsCid)`, `getDocument(bytes32 docHash)`.
- Event: document registration with document hash, owner, IPFS CID, and timestamp.

### `SignatureLog.sol`

- Records every Privy signing event.
- Main function:

```solidity
logSignature(
  bytes32 docHash,
  bytes32 payloadHash,
  bytes32 sigHash,
  bytes32 previousSigHash,
  bytes32 signerHash
)
```

- Event:

```solidity
DocumentSigned(
  bytes32 indexed docHash,
  bytes32 indexed signerHash,
  bytes32 indexed sigHash,
  bytes32 payloadHash,
  bytes32 previousSigHash,
  uint256 timestamp
)
```

### `WorkflowTracker.sol`

- Keeps simple workflow audit events for future or external workflow integrations.
- Current signature chain verification does not depend on workflow roles or steps.

### `AgencyRegistry.sol`

- Logs first-party agency lifecycle audit events for the user-to-agency services module.
- Main events:
  - agency enrolled by platform admin;
  - agency admin registered with admin wallet hash;
  - officer registered with officer wallet hash;
  - service created;
  - service workflow configured.
- This contract is an audit log for lifecycle events only. Signature validity still depends on `SignatureLog`, linked `previousSignatureHash` values, and PostgreSQL chain traversal.

### Future Scope

- External agency apps can keep service, role, and workflow state off-chain while using BondChain for NDI-gated signing and verification.

---

## 10. Backend API Routes

Base: Express.js in `bondchain/packages/backend/src/app.ts`.

### Auth

| Method | Route | Description |
|---|---|---|
| POST | `/auth/ndi/initiate` | Create Bhutan NDI login proof request and return QR/deep-link data |
| GET | `/auth/ndi/status/:threadId` | Poll login proof status; sets `bondchain_session` when verified |
| POST | `/auth/session/verify` | Validate active BondChain NDI session |
| POST | `/auth/logout` | Clear session cookie |

### Onboarding

| Method | Route | Description |
|---|---|---|
| POST | `/onboard` | Create/reuse Privy wallet, compute `linkageHash`, register on-chain, store user |

### Documents

| Method | Route | Description |
|---|---|---|
| POST | `/documents/upload` | Upload document to IPFS, compute hash, register hash on-chain |

### Signing

| Method | Route | Description |
|---|---|---|
| POST | `/api/signing/initiate` | Create signing session and return `redirectUrl` |
| GET | `/api/signing/session/:token` | Fetch signing session for `/sign` overlay |
| POST | `/sign/document` | Validate NDI session, compute payload hash, Privy-sign, log on-chain |

`POST /api/signing/initiate` accepts:

```json
{
  "documentHash": "0x...",
  "previousSignatureHash": "0x...",
  "callbackUrl": "https://agency.example.bt/callback",
  "documentName": "Optional display name"
}
```

`previousSignatureHash` is optional for the first signer. It must exist and belong to the same `documentHash` for later signers.

### Verification

| Method | Route | Description |
|---|---|---|
| GET | `/verify/:signatureHash` | Public verification response with final signature and chain |
| GET | `/verify/document/:docHash` | Public document-hash lookup that lists every signature recorded for the uploaded document hash |
| GET | `/verify/:signatureHash/signer` | NDI-gated signer verification for a signature hash |

### User-to-User

| Method | Route | Description |
|---|---|---|
| POST | `/peer-requests` | Create CID-locked peer signing request and email target signer |
| GET | `/peer-requests/:token` | Load peer request for target signing page |
| POST | `/peer-requests/:token/sign` | Validate target signer CID via NDI and countersign document |
| GET | `/history` | Private NDI-gated activity history |

### User-to-Agency

| Method | Route | Description |
|---|---|---|
| GET | `/admin/agencies` | Platform admin list of enrolled agencies |
| POST | `/admin/agencies` | Platform admin enrolls an agency and sends agency admin invitation |
| POST | `/agency/invitations/:token/accept` | Agency admin accepts invitation after NDI/CID validation |
| GET | `/agency/me` | Agency admin/officer dashboard context |
| POST | `/agency/officers` | Agency admin invites an agency officer by email and CID |
| POST | `/agency/officer-invitations/:token/accept` | Officer accepts invitation after NDI/CID validation |
| POST | `/agency/services` | Agency admin creates a service |
| POST | `/agency/services/:serviceId/workflow` | Agency admin configures ordered verifier/signer/issuer steps |
| GET | `/services` | Public/citizen list of active agency services |
| POST | `/services/:serviceId/requests` | Citizen submits a service request |
| GET | `/agency/requests/:token` | Assigned officer loads a request action link |
| POST | `/agency/requests/:token/approve` | Verifier approves or signer signs a workflow step |
| POST | `/agency/requests/:token/reject` | Officer rejects with reason |
| POST | `/agency/requests/:token/issue` | Issuer uploads final certificate PDF, signs/logs it, and issues NDI credential |

---

## 11. Frontend Pages

Framework: Next.js in `bondchain/packages/nextjs/app`.

| Route | Description |
|---|---|
| `/` | Main entry page |
| `/onboard` | NDI login and Privy wallet binding |
| `/sign` | BondChain signing API overlay loaded with `?session=<token>` |
| `/user-to-user` | Origin user PDF upload, first signature, and peer request creation |
| `/user-to-user/sign/[token]` | Target user PDF preview, NDI CID validation, and countersigning |
| `/history` | Private activity dashboard for uploaded, sent, received, and signed documents |
| `/verify/document` | Public document-hash verification page where users upload a document and see all signatures for its computed hash |
| `/verify/[signatureHash]` | Public document/signature verification page with chain trace |
| `/verify/[signatureHash]/signer` | NDI signer verification page for a selected signature |

The current UI intentionally avoids showing workflow role names or step labels in the signing and verification surface.

---

## 12. Database Schema

Prisma schema: `bondchain/packages/backend/prisma/schema.prisma`.

### `User`

```text
id, didKey, privyWalletId, privyWalletAddress, cidHash, fullName, linkageHash, createdAt
```

### `Document`

```text
id, ipfsCid, fileName, mimeType, docHash, ownerDid, ownerWallet, txHash, createdAt
```

`docHash` is indexed but not unique. The same PDF can be uploaded more than once; each upload gets its own `Document` row and its own `DocumentRegistry` record.

### `Signature`

```text
id,
docHash,
signerDid,
signerWallet,
signerWalletHash,
payloadHash,
previousSignatureHash,
signature,
signatureHash,
txHash,
createdAt
```

`signatureHash` is unique. `signerWallet` is a private database value used for runtime verification; public surfaces use `signerWalletHash`.

### `SigningSession`

```text
id,
token,
documentHash,
previousSignatureHash,
documentName,
callbackUrl,
status,
signatureHash,
txHash,
createdAt,
updatedAt
```

### `PeerSigningRequest`

```text
id,
token,
documentId,
docHash,
requesterDid,
requesterEmail,
targetEmail,
targetCidHash,
requesterSignatureHash,
targetSignatureHash,
status,
createdAt,
updatedAt,
signedAt
```

### Agency service models

The user-to-agency module stores private workflow metadata in PostgreSQL:

- `Agency` for enrolled agencies and registration status.
- `AgencyInvitation` for agency admin email/CID invitations.
- `AgencyMember` for agency admins and officers linked to NDI DID and CID hash.
- `AgencyOfficerInvitation` for officer invitations.
- `AgencyService` for agency-configured services and requirement mode.
- `AgencyServiceWorkflowStep` for ordered verifier/signer/issuer assignments.
- `AgencyServiceRequest` for citizen submissions and request state.
- `AgencyRequestStep` for per-step officer actions, reasons, and signature links.
- `AgencyIssuedCertificate` for issuer-uploaded certificate PDFs and NDI credential issuance metadata.

---

## 13. Key Dependencies

### Backend

- `express` - HTTP server
- `@privy-io/node` - Privy server wallet creation and signing
- `@prisma/client` / `prisma` - PostgreSQL ORM and migrations
- `viem` - Hashing, contract writes, Sepolia interactions
- `nats` / `nkeys.js` - Bhutan NDI NATS proof-result subscription
- `jsonwebtoken` / `cookie-parser` - NDI-gated session cookie
- `multer` - Document upload handling
- `nodemailer` - Gmail SMTP email notifications for peer signing requests
- Pinata HTTP API - IPFS uploads

### Frontend

- `next` / React - App router UI
- Scaffold-ETH 2 packages - Ethereum app shell and contract integration
- `qrcode.react` - NDI QR rendering

`IPFS_GATEWAY_BASE` should be a Pinata dedicated gateway such as `https://your-gateway.mypinata.cloud`; the backend appends `/ipfs/<cid>` automatically unless `{cid}` is present in the value.

### Smart Contracts

- Foundry - Contract development and tests
- `solidity ^0.8.20`
- Deployed target: Ethereum Sepolia testnet

---

## 14. Out of Scope for the Hackathon

- Token or NFT logic
- Smart contract upgradeability
- Native mobile app
- Direct NDI signing
- Public exposure of raw signer wallet addresses
- On-chain storage of workflow role labels or step names

---

## 15. Public Verification Flow

Anyone with a verification link can confirm a document's authenticity without an account:

1. Open `/verify/<signatureHash>`.
2. Backend resolves the signature from PostgreSQL.
3. Backend walks backward through `previousSignatureHash` until the zero hash or a missing link.
4. Page displays document hash, payload hash, signer wallet hash, signature hash, previous signature hash, timestamp, transaction hash, and chain order.
5. If all links are present and belong to the same document hash, `chainStatus` is `VERIFIED`.
6. If a previous link is missing, `chainStatus` is `BROKEN` and `brokenAt` identifies the missing hash.
7. The verifier page must not rely on a PDF preview as proof. It provides a document upload control, computes `keccak256(file bytes)` in the browser, and compares the produced hash against every signature record in the displayed chain.
8. `/verify/document` computes `keccak256(file bytes)` for an uploaded document and calls `/verify/document/:docHash` to list all signing records stored for that exact hash.

### Verify Signer With NDI

The public verifier can prove whether the current NDI user is the signer behind a displayed signer hash:

1. User clicks "Verify signer with NDI" for a chain item.
2. App opens `/verify/<signatureHash>/signer`.
3. User completes NDI login.
4. Backend extracts `did:key` from the NDI session.
5. Backend finds the Privy wallet linked to that DID in PostgreSQL.
6. Backend computes `keccak256(lowercaseWalletAddress)`.
7. Backend compares the computed hash to the signature record's `signerWalletHash`.
8. If hashes match, the app can say the document was signed by that NDI-authenticated user.

This proves signer identity without publishing the raw wallet address on-chain or in the public verifier page.

---

## 16. Current Verification Commands

The implementation has recently passed:

```bash
yarn foundry:test
yarn backend:build
yarn next:check-types
yarn lint
yarn next:build
```

`yarn next:build` may show non-fatal dependency warnings from wallet packages, but the build completes.

---

*BondChain - Signed on chain. Verified with NDI.*
