# BondChain

platform : https://bondchain.jigmenidup.site

dms link: https://dms.jigmenidup.site

BondChain is an NDI-gated document signing and verification app. It binds a Bhutan NDI identity to a Privy server wallet, signs document hashes through Privy, stores document files on IPFS through Pinata, and writes audit records to Ethereum Sepolia.

## What It Does

- Onboard a Bhutan NDI user and bind their DID to a Privy wallet.
- Upload PDF documents to public IPFS through Pinata.
- Sign documents with a Privy server wallet after NDI login.
- Send user-to-user signing requests by email.
- Validate the target signer by CID hash from their NDI proof.
- Verify a linked signature chain from requester to target signer.
- Let citizens submit agency service requests with ordered officer workflows.
- Let agency officers verify, sign, reject, and issue certificate credentials.
- Verify an uploaded document hash and list all signatures recorded for that document.
- Show a private history page for uploaded, sent, received, signed, and agency-service documents.

NDI is only used for identity and session gating. Privy performs all cryptographic signing.

## App Routes

| Route | Purpose |
|---|---|
| `/` | BondChain overview and entry points |
| `/onboard` | NDI login and Privy wallet binding |
| `/user-to-user` | Upload a PDF, sign it, and send a target signer request |
| `/user-to-user/sign/[token]` | Target signer PDF preview and countersigning flow |
| `/services` | Public citizen service catalog |
| `/services/[serviceId]` | Citizen service request submission |
| `/agency` | Agency admin console for officers, services, workflows, and requests |
| `/agency/register/[token]` | Agency admin invitation registration |
| `/agency/officer/register/[token]` | Agency officer invitation registration |
| `/agency/requests/[token]` | Officer workflow action page |
| `/admin` | Platform admin agency enrollment page |
| `/history` | Private NDI-gated signing history |
| `/sign` | API signing overlay for external apps, not shown in header navigation |
| `/verify/document` | Upload a document, compute its hash, and list all signatures for that hash |
| `/verify/[signatureHash]` | Public verification page with linked signature chain |
| `/verify/[signatureHash]/signer` | NDI-based signer hash verification |

Developer wallet-connect UI, faucet UI, block explorer pages, debug contract screens, `/sign`, and `/verify/demo` are intentionally removed from the product navigation.

## Repository Structure

```text
packages/backend   Express API, Prisma, NDI, Privy, Pinata, email, relayer
packages/nextjs    BondChain frontend
packages/foundry   Solidity contracts and Foundry tests
API.md             External signing and peer request API details
Onboarding.md      Current NDI + Privy onboarding flow
```

## Environment

Backend variables live in `packages/backend/.env`.

Required core values:

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://...
SESSION_SECRET=replace-with-a-long-random-secret
PLATFORM_ADMIN_DID_KEYS=did:key:z...

NDI_ISSUER_SCHEMA_ID=https://dev-schema.ngotag.com/schemas/6e6ae22d-8391-439e-8b74-16603777a782

PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_AUTHORIZATION_PUBLIC_KEY=
PRIVY_AUTHORIZATION_PRIVATE_KEY=

PINATA_JWT=
IPFS_GATEWAY_BASE=https://your-gateway.mypinata.cloud

RPC_URL=
RELAYER_PRIVATE_KEY=
IDENTITY_REGISTRY_ADDRESS=
DOCUMENT_REGISTRY_ADDRESS=
SIGNATURE_LOG_ADDRESS=
WORKFLOW_TRACKER_ADDRESS=
AGENCY_REGISTRY_ADDRESS=

GMAIL_USER=
GMAIL_APP_PASSWORD=
MAIL_FROM=
```

NDI staging defaults are already provided in the backend config and `.env.example`.

Frontend variables live in `packages/nextjs/.env.local`.

```env
NEXT_PUBLIC_BONDCHAIN_API_URL=http://localhost:4000
```

## Local Development

Install dependencies:

```bash
yarn install
```

Deploy or configure contracts, then apply backend migrations:

```bash
yarn backend:prisma:migrate
```

Start the backend:

```bash
yarn backend:dev
```

Start the frontend:

```bash
yarn start
```

Open:

```text
http://localhost:3000
```

## Contract Workflow

Contracts are in `packages/foundry/contracts`.

Run tests:

```bash
yarn foundry:test
```

Deploy contracts:

```bash
yarn deploy --network sepolia
```

If Sepolia returns `replacement transaction underpriced`, the deployer account likely has a pending nonce. Resume the latest broadcast with a higher EIP-1559 fee:

```bash
yarn deploy --network sepolia --gas-price 2gwei --priority-gas-price 1gwei --resume --slow
```

If it is still underpriced, increase both gas values, for example:

```bash
yarn deploy --network sepolia --gas-price 5gwei --priority-gas-price 2gwei --resume --slow
```

After redeploying, update the backend contract address environment variables. The current `DocumentRegistry` supports multiple records for the same `docHash`; redeploy it before relying on duplicate document hash registrations on-chain.

## Verification Commands

```bash
yarn backend:build
yarn next:check-types
yarn lint
yarn foundry:test
yarn next:build
```

`yarn next:build` can show non-fatal dependency warnings from wallet-related packages still present in the dependency tree, but the BondChain UI no longer exposes wallet connect or debug contract flows.

## Notes

- PDF uploads are sent to Pinata with `network=public`.
- `docHash` is not unique in the database or `DocumentRegistry`; repeated uploads create separate records.
- User-to-user target CID values are normalized and stored only as SHA-256 hashes.
- Public verification shows signer wallet hashes, not raw signer wallet addresses.
- Certificate issuance stores the certificate PDF on IPFS, but the issuer signature continues the existing agency request signature chain instead of starting a new chain from the certificate PDF hash.
- `/verify/document` computes `keccak256(file bytes)` in the browser, then calls the backend to list all signatures stored for that exact document hash.




presentaion link:
https://prezi.com/craft/share/pozzvuydswn9?referral_token=Y5atXclnB3FN
