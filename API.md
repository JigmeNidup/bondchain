# BondChain Signing API

BondChain exposes an OAuth-style redirect flow for external apps that need NDI-gated document signing without managing NDI, wallets, private keys, Privy, or contract writes.

Local development:

```text
Backend:  http://localhost:4000
Frontend: http://localhost:3000
```

## Flow

1. External app computes a `documentHash`.
2. External app calls `POST /api/signing/initiate`.
3. BondChain returns a `redirectUrl`.
4. External app redirects the user to `redirectUrl`.
5. User completes NDI login in BondChain.
6. BondChain creates or reuses the user's Privy server wallet.
7. BondChain computes `payloadHash = keccak256(documentHash + previousSignatureHash)`.
8. Privy signs `payloadHash`.
9. BondChain logs `docHash`, `payloadHash`, `signatureHash`, `previousSignatureHash`, and `signerWalletHash` on-chain.
10. BondChain returns the user to `callbackUrl` with the signature result.

The first signature in a document chain omits `previousSignatureHash`; BondChain uses zero hash.

```text
0x0000000000000000000000000000000000000000000000000000000000000000
```

## Initiate Signing

```http
POST /api/signing/initiate
Content-Type: application/json
```

### Request

First signer:

```json
{
  "documentHash": "0x3b9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff001122",
  "callbackUrl": "https://agency.example.bt/notesheet/callback",
  "documentName": "Budget Notesheet Q2"
}
```

Later signer:

```json
{
  "documentHash": "0x3b9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff001122",
  "previousSignatureHash": "0x7d9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff009999",
  "callbackUrl": "https://agency.example.bt/notesheet/callback",
  "documentName": "Budget Notesheet Q2"
}
```

| Field | Required | Type | Description |
|---|---:|---|---|
| `documentHash` | Yes | `bytes32 hex` | Keccak-256 hash of the document or canonical payload. |
| `previousSignatureHash` | No | `bytes32 hex` | Previous signature hash in this document chain. Omit for the first signature. |
| `callbackUrl` | Yes | URL | URL where BondChain returns the signed result. Must be `http` or `https`. |
| `documentName` | No | string | Human-readable name shown in the signing overlay. |

### Response

```json
{
  "redirectUrl": "http://localhost:3000/sign?session=6f0f8db4-5d12-4f3a-92e8-5c58bb4b2f10",
  "session": {
    "id": "cm123...",
    "token": "6f0f8db4-5d12-4f3a-92e8-5c58bb4b2f10",
    "documentHash": "0x3b9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff001122",
    "previousSignatureHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "documentName": "Budget Notesheet Q2",
    "callbackUrl": "https://agency.example.bt/notesheet/callback",
    "status": "PENDING",
    "signatureHash": null,
    "txHash": null,
    "createdAt": "2026-05-16T08:30:00.000Z",
    "updatedAt": "2026-05-16T08:30:00.000Z"
  }
}
```

Common errors:

- `documentHash` is not `0x` plus 64 hex characters.
- `previousSignatureHash` does not exist.
- `previousSignatureHash` belongs to a different `documentHash`.
- `callbackUrl` is not valid `http` or `https`.

## Redirect URL

Send the user to:

```text
http://localhost:3000/sign?session=<token>
```

BondChain handles NDI login, onboarding, Privy signing, on-chain logging, and callback construction.

## Callback Result

After signing, BondChain redirects to your `callbackUrl` with query params:

```text
https://agency.example.bt/notesheet/callback
  ?signature=0x...
  &signatureHash=0x...
  &txHash=0x...
  &verificationLink=http%3A%2F%2Flocalhost%3A3000%2Fverify%2F0x...
```

| Param | Description |
|---|---|
| `signature` | Raw Privy-produced signature over `payloadHash`. |
| `signatureHash` | Keccak-256 hash of the raw signature. Use this as the public verification ID. |
| `txHash` | Transaction hash for the on-chain signature log. |
| `verificationLink` | Public BondChain verification page for this signature. |

Store `signatureHash` and pass it as `previousSignatureHash` for the next signer in the same document chain.

## Chained Payload

BondChain signs only the document hash and previous signature hash:

```text
payloadHash = keccak256(abi.encodePacked(documentHash, previousSignatureHash))
```

No roles or steps are included in the cryptographic payload, stored signature record, or verification UI.

## Public Verification

```http
GET /verify/:signatureHash
```

Example:

```bash
curl "http://localhost:4000/verify/0xSIGNATURE_HASH"
```

Response:

```json
{
  "signature": {
    "id": "cm123...",
    "docHash": "0x3b9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff001122",
    "signerWalletHash": "0x...",
    "payloadHash": "0x...",
    "previousSignatureHash": "0x7d9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff009999",
    "signature": "0x...",
    "signatureHash": "0x...",
    "txHash": "0x...",
    "createdAt": "2026-05-16T08:35:00.000Z"
  },
  "chain": [
    {
      "docHash": "0x3b9f...",
      "signerWalletHash": "0x...",
      "payloadHash": "0x...",
      "previousSignatureHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "signature": "0x...",
      "signatureHash": "0x...",
      "txHash": "0x...",
      "createdAt": "2026-05-16T08:31:00.000Z"
    },
    {
      "docHash": "0x3b9f...",
      "signerWalletHash": "0x...",
      "payloadHash": "0x...",
      "previousSignatureHash": "0x...",
      "signature": "0x...",
      "signatureHash": "0x...",
      "txHash": "0x...",
      "createdAt": "2026-05-16T08:35:00.000Z"
    }
  ],
  "chainStatus": "VERIFIED",
  "brokenAt": null,
  "document": {
    "ipfsCid": "bafy...",
    "docHash": "0x3b9f...",
    "ownerWallet": "0x742d..."
  }
}
```

`chain` is ordered from the first signature to the pasted/final signature.

If a previous signature is missing, `chainStatus` is `BROKEN` and `brokenAt` is the missing hash.

## Verify Signer With NDI

The public verification page provides a “Verify signer with NDI” action per chain item.

Backend endpoint:

```http
GET /verify/:signatureHash/signer
Cookie: bondchain_session=<NDI session cookie>
```

This endpoint requires the user to complete NDI login first through BondChain. It does not reveal the raw signer wallet publicly.

Response:

```json
{
  "verified": true,
  "didKey": "did:key:z...",
  "signerWalletHash": "0x...",
  "resolvedWalletHash": "0x...",
  "signatureHash": "0x..."
}
```

Verification logic:

1. NDI login returns the user's `did:key`.
2. BondChain looks up that DID's linked Privy wallet in Postgres.
3. BondChain computes `keccak256(lowercaseWalletAddress)`.
4. BondChain compares that hash with the signature record's `signerWalletHash`.

## User-to-User Signing

BondChain also exposes a first-party two-user signing flow.

1. Origin user logs in with NDI.
2. Origin user uploads a PDF through `POST /documents/upload`.
3. Origin user signs the document with `POST /sign/document`.
4. Origin user creates a peer signing request with target CID and target email.
5. Target user receives an email link, logs in with NDI, previews the PDF, and signs.
6. Target signature uses the origin signature as `previousSignatureHash`.
7. Origin user receives an email with the final verification link.

CID numbers are normalized to digits and stored only as SHA-256 hashes for request matching.

### Upload PDF

```http
POST /documents/upload
Cookie: bondchain_session=<NDI session cookie>
Content-Type: multipart/form-data
```

Field:

| Field | Required | Description |
|---|---:|---|
| `file` | Yes | PDF file only. The backend stores it on IPFS and registers its hash on-chain. |

Response:

```json
{
  "document": {
    "id": "cm...",
    "ipfsCid": "bafy...",
    "fileName": "agreement.pdf",
    "mimeType": "application/pdf",
    "docHash": "0x...",
    "ownerWallet": "0x...",
    "txHash": "0x...",
    "createdAt": "2026-05-16T...",
    "ipfsGatewayUrl": "https://your-gateway.mypinata.cloud/ipfs/bafy..."
  }
}
```

### Create Peer Request

```http
POST /peer-requests
Cookie: bondchain_session=<NDI session cookie>
Content-Type: application/json
```

Request:

```json
{
  "docHash": "0xDOCUMENT_HASH",
  "requesterSignatureHash": "0xORIGIN_SIGNATURE_HASH",
  "targetCid": "1234",
  "targetEmail": "target@example.com",
  "requesterEmail": "origin@example.com"
}
```

Response:

```json
{
  "request": {
    "token": "7c3c...",
    "docHash": "0xDOCUMENT_HASH",
    "requesterSignatureHash": "0xORIGIN_SIGNATURE_HASH",
    "targetSignatureHash": null,
    "status": "PENDING",
    "signingLink": "http://localhost:3000/user-to-user/sign/7c3c...",
    "verificationLink": null
  }
}
```

### Read Peer Request

```http
GET /peer-requests/:token
```

Used by `/user-to-user/sign/:token` to show request status and the IPFS PDF preview URL.

### Target Signs Peer Request

```http
POST /peer-requests/:token/sign
Cookie: bondchain_session=<NDI session cookie>
```

The backend compares the logged-in user's NDI CID hash with the request's target CID hash. If it matches, BondChain signs:

```text
payloadHash = keccak256(abi.encodePacked(documentHash, requesterSignatureHash))
```

Response includes the final `verificationLink`.

## Private History

```http
GET /history
Cookie: bondchain_session=<NDI session cookie>
```

Returns private activity for the logged-in NDI user:

- uploaded documents
- signatures created by the user
- peer requests sent by the user
- peer requests assigned to the user's CID hash

The `/history` frontend page uses this endpoint for the private activity dashboard.

### IPFS Gateway Configuration

Set `IPFS_GATEWAY_BASE` to your Pinata dedicated gateway, not a random public gateway:

```text
IPFS_GATEWAY_BASE=https://your-gateway.mypinata.cloud
```

BondChain accepts any of these forms and will insert the CID correctly:

```text
https://your-gateway.mypinata.cloud
https://your-gateway.mypinata.cloud/ipfs
https://your-gateway.mypinata.cloud/ipfs/{cid}
```

The backend uploads PDFs to Pinata with `network=public`. Existing documents uploaded before this setting may have been uploaded to Pinata's private network and should be re-uploaded.

`docHash` is not unique in the database or `DocumentRegistry`. Re-uploading the same PDF creates a new database row and a new on-chain document record under the same hash.

## Minimal Node Integration

```ts
const BONDCHAIN_API_URL = "http://localhost:4000";

async function initiateBondChainSigning(input: {
  documentHash: string;
  callbackUrl: string;
  documentName?: string;
  previousSignatureHash?: string;
}) {
  const response = await fetch(`${BONDCHAIN_API_URL}/api/signing/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const { redirectUrl } = await response.json();
  return redirectUrl;
}

const firstRedirectUrl = await initiateBondChainSigning({
  documentHash: "0x3b9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff001122",
  callbackUrl: "https://agency.example.bt/notesheet/callback",
  documentName: "Budget Notesheet Q2",
});

const nextRedirectUrl = await initiateBondChainSigning({
  documentHash: "0x3b9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff001122",
  previousSignatureHash: "0xPREVIOUS_SIGNATURE_HASH",
  callbackUrl: "https://agency.example.bt/notesheet/callback",
  documentName: "Budget Notesheet Q2",
});
```

Redirect the user to the returned URL:

```ts
return Response.redirect(firstRedirectUrl, 302);
```

## Signing Sequence

1. First signer calls `POST /api/signing/initiate` without `previousSignatureHash`.
2. External app stores callback `signatureHash`.
3. Next signer calls `POST /api/signing/initiate` with the same `documentHash` and `previousSignatureHash` set to the previous callback's `signatureHash`.
4. Repeat for each later signer.
5. Use the final `verificationLink` to view the complete chain.

If the document changes after rejection, compute a new `documentHash` and start a new chain.

## Local Testing

1. Start local chain:

```bash
yarn chain
```

2. Deploy contracts:

```bash
yarn deploy
```

3. Fill `packages/backend/.env` with database, NDI, Privy, Pinata, relayer, and deployed contract values.

4. Apply migrations:

```bash
yarn backend:prisma:migrate
```

5. Start backend:

```bash
yarn backend:dev
```

6. Start frontend:

```bash
yarn start
```

7. Initiate the first signature:

```bash
curl -X POST "http://localhost:4000/api/signing/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "documentHash": "0x3b9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff001122",
    "callbackUrl": "http://localhost:3000/demo/callback",
    "documentName": "Demo Notesheet"
  }'
```

8. Open the returned `redirectUrl`, sign, then use the callback `signatureHash` in the next initiate call:

```bash
curl -X POST "http://localhost:4000/api/signing/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "documentHash": "0x3b9f2f4c1a2f4a3a5b6c7d8e9f00112233445566778899aabbccddeeff001122",
    "previousSignatureHash": "0xPREVIOUS_SIGNATURE_HASH",
    "callbackUrl": "http://localhost:3000/demo/callback",
    "documentName": "Demo Notesheet"
  }'
```

## Security Notes

- Compute `documentHash` server-side from canonical document bytes or canonical JSON.
- Validate callback results against an active request in your app.
- Treat `signatureHash` as the public verification ID.
- Use HTTPS callback URLs outside local development.
- Keep BondChain backend credentials server-side only.
