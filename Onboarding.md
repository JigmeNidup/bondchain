# BondChain Onboarding Flow

This document explains the current BondChain onboarding implementation: how a user proves identity with Bhutan NDI, how BondChain creates a Privy server wallet, how the DID-to-wallet binding is recorded, and what must be configured for it to work.

Local URLs:

```text
Frontend: http://localhost:3000/onboard
Backend:  http://localhost:4000
```

## What Onboarding Does

Onboarding binds one Bhutan NDI identity to one Privy-controlled Ethereum wallet.

The binding is stored in two places:

| Data | Location | Purpose |
|---|---|---|
| `didKey -> privyWalletAddress` | PostgreSQL `User` table | Runtime lookup for signing and verification |
| `linkageHash = keccak256(didKey + lowercaseWalletAddress)` | `IdentityRegistry` contract | Public proof that the DID and wallet were bound by BondChain |

NDI is used only for identity/session gating. Privy performs all cryptographic wallet operations.

## End-to-End Flow

1. User opens `/onboard`.
2. Frontend calls `POST /auth/ndi/initiate`.
3. Backend authenticates with NDI and creates a login proof request.
4. Frontend displays the NDI QR code and deep link.
5. User approves the proof in the NDI Wallet.
6. NDI publishes the proof result through NATS.
7. Frontend polls `GET /auth/ndi/status/:threadId`.
8. Backend receives the NATS proof result and extracts `holderDid`.
9. Backend sets a short-lived `bondchain_session` cookie containing the DID.
10. User clicks “Complete wallet binding”.
11. Frontend calls `POST /onboard`.
12. Backend creates or reuses a Privy Ethereum wallet for that DID.
13. Backend computes `linkageHash`.
14. Backend calls `IdentityRegistry.registerIdentity(linkageHash, walletAddress)`.
15. Backend stores the user row in PostgreSQL.
16. Frontend shows wallet address, linkage hash, and transaction hash.

## Frontend Page

Main file:

```text
packages/nextjs/app/onboard/page.tsx
```

The page has three visible stages:

1. NDI proof
2. Privy wallet
3. Sepolia linkage

Client-side behavior:

- `POST /auth/ndi/initiate` starts the NDI login flow.
- QR code is rendered from `proofRequestURL`.
- Mobile deep link uses `deepLinkURL`.
- Status polling runs every 2.5 seconds against `/auth/ndi/status/:threadId`.
- After NDI verification, the page enables `POST /onboard`.

## Backend Endpoints

Main file:

```text
packages/backend/src/app.ts
```

### Start NDI Login

```http
POST /auth/ndi/initiate
```

Returns NDI proof request data:

```json
{
  "proofRequestThreadId": "50cc681c-...",
  "proofRequestURL": "https://...",
  "deepLinkURL": "bhutanndidemo://data?url=https://..."
}
```

The frontend turns `proofRequestURL` into a QR code and renders `deepLinkURL` as the mobile wallet button.

### Check NDI Status

```http
GET /auth/ndi/status/:threadId
```

Pending response:

```json
{
  "status": "PENDING"
}
```

Verified response:

```json
{
  "status": "VERIFIED",
  "didKey": "did:key:z...",
  "revealedAttributes": {
    "Full Name": "...",
    "ID Number": "..."
  },
  "user": null
}
```

When verified, the backend also sets:

```text
bondchain_session=<jwt>
```

The cookie is:

- `httpOnly`
- `sameSite: lax`
- 30 minute expiry
- `secure` only in production

### Verify Current Session

```http
POST /auth/session/verify
```

Returns whether the current browser has a valid NDI-backed BondChain session.

### Complete Onboarding

```http
POST /onboard
Cookie: bondchain_session=<jwt>
```

Creates the Privy wallet and on-chain binding if this DID is new. If the DID is already onboarded, returns the existing user.

Response:

```json
{
  "created": true,
  "txHash": "0x...",
  "user": {
    "id": "cm...",
    "didKey": "did:key:z...",
    "privyWalletId": "privy-wallet-id",
    "privyWalletAddress": "0x...",
    "linkageHash": "0x...",
    "createdAt": "2026-05-16T..."
  }
}
```

## NDI Implementation

Main file:

```text
packages/backend/src/services/ndi.ts
```

### Auth

NDI auth uses OAuth2 client credentials:

```text
POST https://staging.bhutanndi.com/authentication/v1/authenticate
```

The backend caches the NDI access token until shortly before expiry.

Important host split:

| NDI operation | Host |
|---|---|
| Auth token | `https://staging.bhutanndi.com` |
| Proof request | `https://demo-client.bhutanndi.com` |
| NATS events | `wss://natsdemoclient.bhutanndi.com` |

### Proof Request

BondChain requests a login proof using:

```json
{
  "proofName": "BondChain login",
  "proofAttributes": [
    {
      "name": "ID Number",
      "restrictions": [{ "schema_name": "<foundational schema>" }]
    },
    {
      "name": "Full Name",
      "restrictions": [{ "schema_name": "<foundational schema>" }]
    }
  ],
  "purpose": "login",
  "authenticationLevel": "Standard",
  "isShortenUrl": true
}
```

### NATS Result Handling

The backend subscribes to:

```text
>
```

NDI can publish the same proof result on multiple subjects. BondChain normalizes the NATS envelope and stores results in memory by `threadId`.

A proof is accepted only when:

```text
inner.type === "present-proof/presentation-result"
inner.verification_result === "ProofValidated"
holderDid exists
```

The current implementation keeps proof results in memory. Restarting the backend clears pending proof results.

## Privy Wallet Implementation

Main file:

```text
packages/backend/src/services/privy.ts
```

BondChain uses app-controlled Privy Ethereum wallets.

Wallet creation:

```ts
client.wallets().create({
  chain_type: "ethereum",
  owner: { public_key: PRIVY_AUTHORIZATION_PUBLIC_KEY },
});
```

The returned wallet fields used by BondChain are:

```text
wallet.id
wallet.address
```

These are stored in PostgreSQL:

```text
privyWalletId
privyWalletAddress
```

## Privy Authorization Keys

Privy authorization keys are P-256 keys. They are not Ethereum private keys.

Generate a local keypair:

```bash
mkdir -p .secrets
openssl ecparam -name prime256v1 -genkey -noout -out .secrets/privy-auth-private.pem
openssl ec -in .secrets/privy-auth-private.pem -pubout -out .secrets/privy-auth-public.pem
```

Public key for `PRIVY_AUTHORIZATION_PUBLIC_KEY`:

```bash
openssl ec -in .secrets/privy-auth-private.pem -pubout -outform DER | base64 -w 0
```

Private key for `PRIVY_AUTHORIZATION_PRIVATE_KEY`:

```bash
cat .secrets/privy-auth-private.pem
```

The backend accepts either:

- base64 PKCS8 private key with no PEM headers, or
- PEM private key with escaped/newline formatting.

The backend normalizes PEM to base64 PKCS8 before signing Privy wallet API requests.

## Linkage Hash

Main file:

```text
packages/backend/src/services/contracts.ts
```

Hash function:

```ts
linkageHash = keccak256(toBytes(`${didKey}${walletAddress.toLowerCase()}`));
```

This links:

```text
NDI holder DID + Privy wallet address
```

The same formula must be used for external verification.

## Smart Contract Binding

Main contract:

```text
packages/foundry/contracts/IdentityRegistry.sol
```

Backend call:

```solidity
registerIdentity(bytes32 linkageHash, address privyWallet)
```

Contract behavior:

- rejects empty linkage hash;
- rejects zero wallet address;
- stores the wallet and timestamp by `linkageHash`;
- maps wallet address back to linkage hash;
- returns `false` when the exact same binding already exists;
- reverts if a linkage hash or wallet is already bound differently.

The backend relayer wallet must own the deployed contract because `registerIdentity` is `onlyOwner`.

## Database Records

Prisma model:

```prisma
model User {
  id                 String   @id @default(cuid())
  didKey             String   @unique
  privyWalletId      String
  privyWalletAddress String
  linkageHash        String   @unique
  createdAt          DateTime @default(now())
}
```

The DID is the stable identity key used for:

- future signing sessions;
- signer verification;
- wallet lookup;
- preventing duplicate onboarding.

## Environment Variables

Backend env file:

```text
packages/backend/.env
```

Required for onboarding:

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bondchain
SESSION_SECRET=replace-with-a-long-random-secret

NDI_CLIENT_ID=...
NDI_CLIENT_SECRET=...
NDI_AUTH_BASE=https://staging.bhutanndi.com
NDI_API_BASE=https://demo-client.bhutanndi.com
NDI_NATS_WSS=wss://natsdemoclient.bhutanndi.com
NDI_NATS_NKEY_SEED=...
NDI_FOUNDATIONAL_SCHEMA=https://dev-schema.ngotag.com/schemas/c7952a0a-e9b5-4a4b-a714-1e5d0a1ae076

PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
PRIVY_AUTHORIZATION_PUBLIC_KEY=...
PRIVY_AUTHORIZATION_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"

RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0x...
IDENTITY_REGISTRY_ADDRESS=0x...
```

Also needed elsewhere in the backend, but not directly for onboarding:

```env
PINATA_JWT=...
DOCUMENT_REGISTRY_ADDRESS=0x...
SIGNATURE_LOG_ADDRESS=0x...
WORKFLOW_TRACKER_ADDRESS=0x...
```

## Local Setup

1. Install dependencies:

```bash
yarn install
```

2. Apply DB migrations:

```bash
yarn backend:prisma:migrate
```

3. Start local chain:

```bash
yarn chain
```

4. Deploy contracts:

```bash
yarn deploy
```

5. Put deployed contract addresses in `packages/backend/.env`.

6. Start backend:

```bash
yarn backend:dev
```

7. Start frontend:

```bash
yarn start
```

8. Open:

```text
http://localhost:3000/onboard
```

## Testing the Flow Manually

1. Click “Start NDI login”.
2. Scan the QR code in NDI Wallet or open the deep link.
3. Approve the proof request.
4. Wait until status becomes `VERIFIED`.
5. Click “Complete wallet binding”.
6. Confirm the UI shows:
   - Privy wallet address;
   - linkage hash;
   - transaction hash.
7. Confirm DB has a `User` row.
8. Confirm `IdentityRegistry.verifyIdentity(linkageHash)` returns `true`.

## Common Failures

### NDI verifier returns 401

Verifier endpoints must use:

```text
https://demo-client.bhutanndi.com
```

Auth must use:

```text
https://staging.bhutanndi.com
```

Using `staging` for verifier endpoints causes `401 Unauthorized`.

### NDI status stays pending

Likely causes:

- backend NATS subscriber is not running;
- wrong `NDI_NATS_NKEY_SEED`;
- backend restarted after proof request;
- proof was not approved in wallet;
- NDI published a result with a thread ID not matching the frontend poll.

### `Invalid P-256 public key`

`PRIVY_AUTHORIZATION_PUBLIC_KEY` is not an Ethereum key or wallet address. It must be a base64 DER P-256 public key.

### `Invalid wallet authorization private key`

`PRIVY_AUTHORIZATION_PRIVATE_KEY` must match the authorization public key. The backend can normalize PEM, but the key must still be a valid P-256 private key.

### Contract call reverts with owner error

The backend relayer private key must be the owner of `IdentityRegistry`. Use the deployer key, or transfer contract ownership to the relayer.

### Onboarding returns existing user

That is expected when the same DID has already onboarded. The backend is idempotent by `didKey`.

## Security Notes

- NDI proofs are not stored; only the DID and runtime wallet mapping are stored.
- `bondchain_session` is short-lived and HTTP-only.
- `PRIVY_APP_SECRET`, authorization private key, and relayer private key must never be committed.
- `didKey -> walletAddress` is kept in Postgres because signing and signer verification need runtime lookup.
- Public verification should use `linkageHash` or wallet hashes, not expose DID unless the user explicitly authenticates with NDI.
- Production should use durable proof-result storage or a webhook path instead of only in-memory NATS results.
