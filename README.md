# BondChain

BondChain is an NDI-gated document signing and verification app. It binds a Bhutan NDI identity to a Privy server wallet, signs document hashes through Privy, stores document files on IPFS through Pinata, and writes audit records to Ethereum Sepolia.

## What It Does

- Onboard a Bhutan NDI user and bind their DID to a Privy wallet.
- Upload PDF documents to public IPFS through Pinata.
- Sign documents with a Privy server wallet after NDI login.
- Send user-to-user signing requests by email.
- Validate the target signer by CID hash from their NDI proof.
- Verify a linked signature chain from requester to target signer.
- Show a private history page for uploaded, sent, received, and signed documents.

NDI is only used for identity and session gating. Privy performs all cryptographic signing.

## App Routes

| Route | Purpose |
|---|---|
| `/` | BondChain overview and entry points |
| `/onboard` | NDI login and Privy wallet binding |
| `/user-to-user` | Upload a PDF, sign it, and send a target signer request |
| `/user-to-user/sign/[token]` | Target signer PDF preview and countersigning flow |
| `/history` | Private NDI-gated signing history |
| `/sign` | API signing overlay for external apps |
| `/verify/[signatureHash]` | Public verification page with linked signature chain |
| `/verify/[signatureHash]/signer` | NDI-based signer hash verification |

Developer wallet-connect UI, faucet UI, block explorer pages, and debug contract screens are intentionally removed from the product navigation.

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
