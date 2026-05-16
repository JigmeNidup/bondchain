import { createPublicClient, createWalletClient, encodePacked, http, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, sepolia } from "viem/chains";
import { getConfig } from "../config.js";

const identityAbi = [
  {
    type: "function",
    name: "registerIdentity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "linkageHash", type: "bytes32" },
      { name: "privyWallet", type: "address" },
    ],
    outputs: [{ name: "created", type: "bool" }],
  },
] as const;

const documentAbi = [
  {
    type: "function",
    name: "registerDocument",
    stateMutability: "nonpayable",
    inputs: [
      { name: "docHash", type: "bytes32" },
      { name: "ownerWallet", type: "address" },
      { name: "ipfsCid", type: "string" },
    ],
    outputs: [{ name: "documentId", type: "uint256" }],
  },
] as const;

const signatureAbi = [
  {
    type: "function",
    name: "logSignature",
    stateMutability: "nonpayable",
    inputs: [
      { name: "docHash", type: "bytes32" },
      { name: "payloadHash", type: "bytes32" },
      { name: "sigHash", type: "bytes32" },
      { name: "previousSigHash", type: "bytes32" },
      { name: "signerHash", type: "bytes32" },
    ],
    outputs: [{ name: "created", type: "bool" }],
  },
] as const;

const workflowAbi = [
  {
    type: "function",
    name: "createWorkflow",
    stateMutability: "nonpayable",
    inputs: [{ name: "docHash", type: "bytes32" }],
    outputs: [{ name: "created", type: "bool" }],
  },
  {
    type: "function",
    name: "advanceStep",
    stateMutability: "nonpayable",
    inputs: [
      { name: "docHash", type: "bytes32" },
      { name: "step", type: "uint8" },
      { name: "approver", type: "address" },
    ],
    outputs: [],
  },
] as const;

const chainForRpc = (rpcUrl: string) => (rpcUrl.includes("11155111") || rpcUrl.includes("sepolia") ? sepolia : foundry);

export const computeLinkageHash = (didKey: string, walletAddress: string) =>
  keccak256(toBytes(`${didKey}${walletAddress.toLowerCase()}`));

export const computeDocumentHash = (buffer: Buffer) => keccak256(buffer);

export const computeWalletHash = (walletAddress: string) => keccak256(toBytes(walletAddress.toLowerCase()));

export const ZERO_SIGNATURE_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export const computeSigningPayloadHash = (documentHash: Hex, previousSignatureHash: Hex) =>
  keccak256(encodePacked(["bytes32", "bytes32"], [documentHash, previousSignatureHash]));

export class ContractService {
  private clients() {
    const config = getConfig();
    const chain = chainForRpc(config.chain.rpcUrl);
    const transport = http(config.chain.rpcUrl);
    const account = privateKeyToAccount(config.chain.relayerPrivateKey);
    return {
      config,
      publicClient: createPublicClient({ chain, transport }),
      walletClient: createWalletClient({ account, chain, transport }),
      account,
    };
  }

  async registerIdentity(linkageHash: Hex, walletAddress: Hex) {
    const { config, publicClient, walletClient, account } = this.clients();
    const txHash = await walletClient.writeContract({
      address: config.chain.identityRegistry,
      abi: identityAbi,
      functionName: "registerIdentity",
      args: [linkageHash, walletAddress],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  async registerDocument(docHash: Hex, ownerWallet: Hex, ipfsCid: string) {
    const { config, publicClient, walletClient, account } = this.clients();
    const txHash = await walletClient.writeContract({
      address: config.chain.documentRegistry,
      abi: documentAbi,
      functionName: "registerDocument",
      args: [docHash, ownerWallet, ipfsCid],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  async logSignature(docHash: Hex, payloadHash: Hex, signatureHash: Hex, previousSignatureHash: Hex, signerWalletHash: Hex) {
    const { config, publicClient, walletClient, account } = this.clients();
    const txHash = await walletClient.writeContract({
      address: config.chain.signatureLog,
      abi: signatureAbi,
      functionName: "logSignature",
      args: [docHash, payloadHash, signatureHash, previousSignatureHash, signerWalletHash],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  async createWorkflow(docHash: Hex) {
    const { config, publicClient, walletClient, account } = this.clients();
    const txHash = await walletClient.writeContract({
      address: config.chain.workflowTracker,
      abi: workflowAbi,
      functionName: "createWorkflow",
      args: [docHash],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  async advanceWorkflow(docHash: Hex, step: number, signerWallet: Hex) {
    const { config, publicClient, walletClient, account } = this.clients();
    const txHash = await walletClient.writeContract({
      address: config.chain.workflowTracker,
      abi: workflowAbi,
      functionName: "advanceStep",
      args: [docHash, step, signerWallet],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }
}

export const contractService = new ContractService();
