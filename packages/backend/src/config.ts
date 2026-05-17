import "dotenv/config";

type Config = {
  port: number;
  frontendOrigin: string;
  databaseUrl: string;
  sessionSecret: string;
  platformAdminDidKeys: string[];
  ndi: {
    clientId: string;
    clientSecret: string;
    authBase: string;
    apiBase: string;
    natsWss: string;
    nkeySeed: string;
    foundationalSchema: string;
    issuerSchemaId: string;
  };
  privy: {
    appId: string;
    appSecret: string;
    authorizationPublicKey: string;
    authorizationPrivateKey: string;
  };
  pinataJwt: string;
  ipfsGatewayBase: string;
  mail: {
    gmailUser?: string;
    gmailAppPassword?: string;
    from?: string;
  };
  chain: {
    rpcUrl: string;
    relayerPrivateKey: `0x${string}`;
    identityRegistry: `0x${string}`;
    documentRegistry: `0x${string}`;
    signatureLog: `0x${string}`;
    workflowTracker: `0x${string}`;
    agencyRegistry: `0x${string}`;
  };
};

const required = (name: string, fallback?: string) => {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
};

const address = (name: string) => required(name) as `0x${string}`;

export const getConfig = (): Config => ({
  port: Number(process.env.PORT || 4000),
  frontendOrigin: required("FRONTEND_ORIGIN", "http://localhost:3000"),
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  platformAdminDidKeys: (process.env.PLATFORM_ADMIN_DID_KEYS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean),
  ndi: {
    clientId: required("NDI_CLIENT_ID", "3tq7ho23g5risndd90a76jre5f"),
    clientSecret: required("NDI_CLIENT_SECRET", "111rvn964mucumr6c3qq3n2poilvq5v92bkjh58p121nmoverquh"),
    authBase: required("NDI_AUTH_BASE", "https://staging.bhutanndi.com"),
    apiBase: required("NDI_API_BASE", "https://demo-client.bhutanndi.com"),
    natsWss: required("NDI_NATS_WSS", "wss://natsdemoclient.bhutanndi.com"),
    nkeySeed: required("NDI_NATS_NKEY_SEED", "SUAPXY7TJFUFE3IX3OEMSLE3JFZJ3FZZRSRSOGSG2ANDIFN77O2MIBHWUM"),
    foundationalSchema: required(
      "NDI_FOUNDATIONAL_SCHEMA",
      "https://dev-schema.ngotag.com/schemas/c7952a0a-e9b5-4a4b-a714-1e5d0a1ae076",
    ),
    issuerSchemaId: required(
      "NDI_ISSUER_SCHEMA_ID",
      "https://dev-schema.ngotag.com/schemas/6e6ae22d-8391-439e-8b74-16603777a782",
    ),
  },
  privy: {
    appId: required("PRIVY_APP_ID"),
    appSecret: required("PRIVY_APP_SECRET"),
    authorizationPublicKey: required("PRIVY_AUTHORIZATION_PUBLIC_KEY"),
    authorizationPrivateKey: required("PRIVY_AUTHORIZATION_PRIVATE_KEY"),
  },
  pinataJwt: required("PINATA_JWT"),
  ipfsGatewayBase: required("IPFS_GATEWAY_BASE", "https://gateway.pinata.cloud/ipfs"),
  mail: {
    gmailUser: process.env.GMAIL_USER,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
    from: process.env.MAIL_FROM || process.env.GMAIL_USER,
  },
  chain: {
    rpcUrl: required("RPC_URL", "http://127.0.0.1:8545"),
    relayerPrivateKey: address("RELAYER_PRIVATE_KEY"),
    identityRegistry: address("IDENTITY_REGISTRY_ADDRESS"),
    documentRegistry: address("DOCUMENT_REGISTRY_ADDRESS"),
    signatureLog: address("SIGNATURE_LOG_ADDRESS"),
    workflowTracker: address("WORKFLOW_TRACKER_ADDRESS"),
    agencyRegistry: address("AGENCY_REGISTRY_ADDRESS"),
  },
});
