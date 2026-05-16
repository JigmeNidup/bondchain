# BondChain Frontend Design, UI/UX, and NDI Modal Spec

This folder documents the current frontend design direction only. It is intentionally scoped to theme, UI, UX, and the NDI login modal presentation.

> **Important:** Do not break existing working functionality while applying this design spec. Any UI or UX change must preserve the current authentication flow, NDI modal behavior, API integration, redirects, global state, forms, permissions, routing, smart contract hooks, and submission behavior.

## Design-Only Scope

Design and UI polish work must stay presentation-only unless a task explicitly asks for functional changes. It may improve layout, spacing, typography, visual hierarchy, icons, copy clarity, loading states, empty states, accessibility, and responsive behavior.

Do not change product logic while working from this spec. Preserve NDI authentication behavior, API calls, global state updates, redirects, form rules, submission payloads, permission checks, smart contract hooks, and routing behavior.

If a visual improvement appears to require functional changes, document that separately and keep it out of the design-only pass.

## Design Theme

BondChain should feel like a trusted civic operations product: secure, calm, institutional, and modern. The interface is a document workflow tool where citizens and agency officers need to understand status, next actions, and proof quickly.

### Visual Direction

- **Institutional trust:** clean white surfaces, restrained shadows, clear borders, and strong hierarchy.
- **Civic technology:** blue and teal are the main product colors, supported by NDI green for identity actions and purple for blockchain or audit moments.
- **Workflow clarity:** each screen should make the current step, required action, and resulting proof obvious.
- **Human identity focus:** NDI identity states should feel official and recognizable, not like a generic wallet login.
- **Auditability:** hashes, signatures, timestamps, and status changes should be visible in compact proof panels.

### Theme Tokens

Use the DaisyUI theme configured in `styles/globals.css`.

- Primary: `#2563eb` for main CTAs, navigation highlights, and citizen-facing action states.
- Secondary: `#0d9488` for agency and routing surfaces.
- Accent: `#7c3aed` for blockchain proof, verification, and immutable audit messaging.
- Success: `#22c55e` for verified, approved, signed, and completed states.
- Warning: `#f59e0b` for pending, waiting, or expiring sessions.
- Error: `#ef4444` for rejected, failed, expired, or blocked actions.
- Base surfaces: white foreground cards over `#f4f8ff` page backgrounds in light mode.
- Dark mode: use the configured DaisyUI dark theme without creating separate page-specific palettes.

### Component Styling

- Use DaisyUI components first: `btn`, `card`, `badge`, `modal`, `tabs`, `alert`, `table`, `drawer`, `steps`, and form controls.
- Use Lucide icons for recognizable actions such as search, upload, verify, refresh, close, approve, reject, and open wallet.
- Cards should represent real items: agencies, services, documents, proof records, or repeated metrics.
- Avoid wrapping whole page sections in decorative cards.
- Buttons should be direct commands. Primary buttons move the workflow forward; ghost buttons are for secondary navigation; error buttons are only for destructive or rejection actions.
- Status badges must be short, color-coded, and consistent across citizen, agency, admin, and public verification pages.


### Interaction States

Every important workflow component needs these states:

- Loading: skeleton or spinner with stable layout.
- Empty: clear explanation and next action.
- Pending: amber state for waiting on user, agency, chain, or NDI approval.
- Success: green confirmation with the identity or proof detail that changed.
- Error: readable message, retry option, and no loss of user-entered data.
- Expired: specific renewal action, especially for QR or signing sessions.


## NDI Login Modal UI Spec

The NDI login modal is the visual identity gateway for BondChain. It appears on `/login` for full session login and as `NdiSigningModal` inside document signing or approval flows.

### Modal UI-Only Guardrail

NDI modal design work may update modal layout, colors, spacing, typography, icons, button styling, loading visuals, status banners, responsive QR/deep-link presentation, and accessibility labels. It must not change the underlying NDI login or signing functionality.

Preserve these existing behaviors:

- QR creation via from the backend .env.
- Verification polling through the existing auth status endpoint.
- Mobile wallet opening through the backend-provided `deepLinkURL`.
- Session expiry, retry, waiting, verifying, success, and error state transitions.
- Global NDI session updates, DID storage, identity binding, role assignment, redirects, `onSuccess`, and `onClose` behavior.

### Layout

- Centered modal on desktop with max width around `448px`.
- White modal surface, `rounded-2xl`, strong shadow, and enough padding for a calm identity flow.
- Background should dim with a dark translucent overlay and subtle blur when used as an overlay modal.
- Header text:
  - Desktop: `Scan with Bhutan NDI wallet`
  - Mobile: `Login with Bhutan NDI`
- Bhutan NDI text and identity controls use NDI green `#4DBB8E`.
- Primary mobile wallet button uses NDI dark `#124143`.

### Desktop QR Flow

- Show a large QR frame, roughly `224px` to `256px`, with a 2px NDI green border.
- QR content is generated from `POST /api/auth/qr`.
- While loading, show a green spinner and `Generating QR Code...` helper text.
- On ready, show the QR code with an NDI logo chip centered over it.
- Instructions:
  - Open Bhutan NDI on your phone.
  - Tap the Scan button and capture the code.
- When waiting or verifying, dim or blur the QR and show a centered processing overlay with an animated spinner ring, NDI logo mark, short status text, and pulsing dots.
- If the QR expires, show `QR Code Expired` and a `Refresh` button.
- If backend connection fails, show a readable error and a `Retry` button.

### Mobile Deep-Link Flow

- Hide the QR code on mobile.
- Show a large NDI logo panel instead.
- Primary CTA: `Open NDI Wallet`.
- Trigger the backend-provided `deepLinkURL` when available.
- While opening or waiting, disable the CTA and show a spinner/loading state.
- Keep helper text short: `Tap the button below to authenticate using your NDI Wallet app.`

### Verification States

- `idle`: QR or wallet CTA is ready.
- `waiting`: user has scanned/opened NDI and must approve in the wallet.
- `verifying`: backend is validating the identity and proof.
- `success`: identity is verified, global session is updated, and the flow continues after a short confirmation delay.
- `error`: verification failed; user can retry without leaving the modal.
- `expired`: QR/session has timed out; user can refresh.

### Success UX

- Show a green success state: `Identity verified successfully`.
- For full login, show a success panel with verified user name, DID or CID fallback, `Enter Portal` button, and automatic redirect to the role-appropriate next route.
- For signing modals, call the parent `onSuccess`, close the modal, and continue the document workflow.


### Accessibility

- The close button must have `aria-label="Close"`.
- Status text must be visible, not only animated.
- Disabled buttons must remain readable.
- Error and expired states must be recoverable from inside the modal.
