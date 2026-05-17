"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { keccak256 } from "viem";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type SignatureChainItem = {
  docHash: string;
  signerWalletHash: string;
  payloadHash: string;
  previousSignatureHash: string;
  signatureHash: string;
  txHash: string;
  createdAt: string;
};

type Verification = {
  signature: SignatureChainItem;
  chain: SignatureChainItem[];
  chainStatus: "VERIFIED" | "BROKEN";
  brokenAt?: string | null;
  document?: {
    ipfsCid: string;
    ownerWallet: string;
  } | null;
};

const shortHash = (value: string) => (value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value);

const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const VerifyPage = () => {
  const params = useParams<{ signatureHash: string }>();
  const signatureHash = params.signatureHash;
  const [verification, setVerification] = useState<Verification | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<SignatureChainItem | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentCheck, setDocumentCheck] = useState<{
    fileName: string;
    documentHash: string;
    matchedCount: number;
    totalCount: number;
    results: { signatureHash: string; docHash: string; matched: boolean }[];
  } | null>(null);
  const [error, setError] = useState("");

  const verifyDocumentFile = async () => {
    if (!documentFile || !verification) return;
    const bytes = new Uint8Array(await documentFile.arrayBuffer());
    const documentHash = keccak256(bytes);
    const results = verification.chain.map(item => ({
      signatureHash: item.signatureHash,
      docHash: item.docHash,
      matched: item.docHash.toLowerCase() === documentHash.toLowerCase(),
    }));
    setDocumentCheck({
      fileName: documentFile.name,
      documentHash,
      matchedCount: results.filter(r => r.matched).length,
      totalCount: results.length,
      results,
    });
  };

  useEffect(() => {
    if (!signatureHash) return;
    bondchainFetch<Verification>(`/verify/${signatureHash}`)
      .then(setVerification)
      .catch(err => setError(err instanceof Error ? err.message : "Verification failed"));
  }, [signatureHash]);

  const isVerified = verification?.chainStatus === "VERIFIED";

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Loading */}
      {!verification && !error && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-base-content/40">Syncing with Registry…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-error/10 bg-error/5 p-5 text-error">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {verification && (
        <div className="animate-in fade-in duration-500">
          {/* Certificate Card */}
          <div className="relative rounded-3xl border border-base-200 bg-base-100 shadow-sm overflow-hidden mb-8">
            {/* Top accent stripe */}
            <div className={`h-1.5 w-full ${isVerified ? "bg-success" : "bg-error"}`} />

            {/* Certificate header */}
            <div className="flex flex-col items-center px-8 pt-10 pb-8 border-b border-base-200 text-center">
              {/* Seal */}
              <div
                className={`relative mb-6 h-20 w-20 rounded-full flex items-center justify-center border-4 ${isVerified ? "border-success/30 bg-success/5 text-success" : "border-error/30 bg-error/5 text-error"}`}
              >
                <Image src="/logo.png" alt="BondChain" width={36} height={36} className="object-contain" />
                <div
                  className={`absolute -inset-2 rounded-full border-2 border-dashed animate-spin [animation-duration:12s] ${isVerified ? "border-success/20" : "border-error/20"}`}
                />
              </div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-base-content/40 mb-2">
                Kingdom of Bhutan · BondChain Protocol
              </p>
              <h1 className="text-2xl font-black text-base-content tracking-tight">Certificate of Authenticity</h1>
              <p className="mt-2 text-sm text-base-content/40 max-w-sm leading-relaxed">
                Public verification of a cryptographically secured civic document
              </p>

              {/* Status badge */}
              <div
                className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black ${isVerified ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}
              >
                {isVerified ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
                {isVerified ? "Chain Integrity Verified" : "Chain Compromised"}
              </div>
            </div>

            {/* Certificate body — key facts */}
            <div className="grid divide-y divide-base-200 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              <div className="px-8 py-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1">
                  Signatures in Chain
                </p>
                <p className="text-3xl font-black text-base-content">{verification.chain.length}</p>
                <p className="text-xs text-base-content/40 mt-0.5">independent signatories</p>
              </div>
              <div className="px-8 py-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1">
                  First Signed
                </p>
                <p className="text-sm font-bold text-base-content">
                  {formatDate(verification.chain[0]?.createdAt ?? verification.signature.createdAt)}
                </p>
                <p className="text-xs text-base-content/40 mt-0.5">origin timestamp</p>
              </div>
            </div>

            {/* Hashes */}
            <div className="px-8 py-6 border-t border-base-200 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1.5">
                  Document Hash
                </p>
                <p className="font-mono text-xs text-base-content/60 break-all leading-relaxed bg-base-200/50 rounded-xl px-4 py-3">
                  {verification.signature.docHash}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1.5">
                  Registry Transaction
                </p>
                <p className="font-mono text-xs text-base-content/60 break-all leading-relaxed bg-base-200/50 rounded-xl px-4 py-3">
                  {verification.signature.txHash}
                </p>
              </div>
            </div>
          </div>

          {/* Signature Timeline */}
          <div className="rounded-3xl border border-base-200 bg-base-100 shadow-sm overflow-hidden mb-8">
            <div className="flex items-center justify-between px-8 py-5 border-b border-base-200">
              <h2 className="text-sm font-black text-base-content uppercase tracking-widest">Provenance Timeline</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-base-content/30 bg-base-200 px-2.5 py-1 rounded-lg">
                {verification.chain.length} event{verification.chain.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-base-200">
              {verification.chain.map((item, index) => {
                const isFinal = index === verification.chain.length - 1;
                return (
                  <div
                    key={item.signatureHash}
                    className="flex items-center gap-5 px-8 py-5 hover:bg-base-200/30 transition-colors"
                  >
                    <div
                      className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-xs font-black border-2 ${isFinal ? "bg-primary border-primary text-primary-content" : "border-base-300 text-base-content/40 bg-base-100"}`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-base-content truncate">Signature #{index + 1}</p>
                      <p className="font-mono text-xs text-base-content/30 truncate">{shortHash(item.signatureHash)}</p>
                    </div>
                    <div className="hidden sm:block text-right shrink-0">
                      <p className="text-xs text-base-content/40">{formatDate(item.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedSignature(item)}
                      className="shrink-0 text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      Details
                      <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verify Document */}
          <div className="rounded-3xl border border-base-200 bg-base-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-base-200">
              <h2 className="text-sm font-black text-base-content uppercase tracking-widest">Verify Your Document</h2>
              <p className="text-xs text-base-content/40 mt-0.5">
                Upload the original PDF to confirm it matches this certificate
              </p>
            </div>
            <div className="px-8 py-6 space-y-4">
              <input
                className="file-input file-input-bordered w-full bg-base-200/50 border-base-300 text-sm"
                type="file"
                accept="application/pdf,.pdf"
                onChange={e => {
                  setDocumentFile(e.target.files?.[0] || null);
                  setDocumentCheck(null);
                }}
              />
              <button
                className="btn btn-primary h-11 w-full gap-2 text-sm"
                disabled={!documentFile}
                onClick={verifyDocumentFile}
              >
                <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                Verify Document
              </button>

              {documentCheck && (
                <div
                  className={`rounded-2xl border p-5 ${documentCheck.matchedCount === documentCheck.totalCount ? "border-success/20 bg-success/5" : "border-warning/20 bg-warning/5"}`}
                >
                  <div
                    className={`flex items-center gap-2 mb-3 ${documentCheck.matchedCount === documentCheck.totalCount ? "text-success" : "text-warning"}`}
                  >
                    {documentCheck.matchedCount === documentCheck.totalCount ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5" />
                    )}
                    <span className="text-sm font-black">
                      {documentCheck.matchedCount} of {documentCheck.totalCount} signatures matched
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-base-content/40 break-all mb-3">
                    {documentCheck.documentHash}
                  </p>
                  <div className="space-y-1.5">
                    {documentCheck.results.map((result, index) => (
                      <div key={result.signatureHash} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-base-content/60">Signature #{index + 1}</span>
                        <span className={`badge badge-sm ${result.matched ? "badge-success" : "badge-warning"}`}>
                          {result.matched ? "Matched" : "Different"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSignature && (
        <div className="modal modal-open backdrop-blur-sm" role="dialog">
          <div className="modal-box max-w-lg rounded-3xl p-0 overflow-hidden shadow-2xl bg-base-100 border border-base-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-base-200">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FingerPrintIcon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black text-base-content">Signature Detail</h3>
              </div>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setSelectedSignature(null)}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-8 py-6 space-y-5">
              {(
                [
                  ["Document Hash", selectedSignature.docHash, CubeIcon],
                  ["Signer Proof", selectedSignature.signerWalletHash, FingerPrintIcon],
                  ["Transaction", selectedSignature.txHash, ArrowTopRightOnSquareIcon],
                  ["Timestamp", formatDate(selectedSignature.createdAt), ClockIcon],
                ] as [string, string, React.ElementType][]
              ).map(([label, value, Icon]) => (
                <div key={label} className="flex gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-base-200 flex items-center justify-center text-base-content/40">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-0.5">
                      {label}
                    </p>
                    <p className="text-xs font-mono text-base-content break-all">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-8 py-5 border-t border-base-200 flex gap-3">
              <Link
                href={`/verify/${selectedSignature.signatureHash}/signer`}
                className="btn btn-primary flex-1 h-11 text-sm"
              >
                Verify NDI Identity
              </Link>
              <button className="btn btn-ghost h-11 px-6 text-sm" onClick={() => setSelectedSignature(null)}>
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setSelectedSignature(null)} />
        </div>
      )}
    </main>
  );
};

export default VerifyPage;
