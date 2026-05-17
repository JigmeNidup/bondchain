"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { keccak256 } from "viem";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  CubeIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
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

const shortHash = (value: string) => (value.length > 20 ? `${value.slice(0, 12)}...${value.slice(-10)}` : value);

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
      matchedCount: results.filter(result => result.matched).length,
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

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header / Brand Area */}
      <div className="text-center mb-16 animate-in fade-in duration-700">
        <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary mx-auto mb-8 shadow-inner border border-primary/10">
          <ShieldCheckIcon className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-black text-base-content leading-tight">Certificate of Authenticity</h1>
        <p className="mt-4 text-base-content/60 max-w-xl mx-auto leading-relaxed">
          Public verification of a cryptographically secured civic document, signed and recorded on the BondChain
          protocol.
        </p>
      </div>

      <section className="grid gap-8 lg:grid-cols-[1fr_350px]">
        <div className="space-y-8">
          {error && (
            <div className="rounded-2xl bg-error/5 border border-error/10 p-6 flex items-center gap-4 text-error font-bold animate-in shake duration-500">
              <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
              <p className="m-0">{error}</p>
            </div>
          )}

          {!verification && !error && (
            <div className="card py-24 flex flex-col items-center justify-center border-dashed border-2 bg-base-200/30">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-base-content/40">
                Syncing with Sepolia Registry
              </p>
            </div>
          )}

          {verification && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Status Banner */}
              <div
                className={`rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden ${
                  verification.chainStatus === "VERIFIED" ? "bg-success/10 text-success" : "bg-error/10 text-error"
                }`}
              >
                <div
                  className={`absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]`}
                />

                <div
                  className={`h-24 w-24 shrink-0 rounded-full flex items-center justify-center shadow-inner relative z-10 ${
                    verification.chainStatus === "VERIFIED" ? "bg-success/20" : "bg-error/20"
                  }`}
                >
                  <ShieldCheckIcon className="h-12 w-12" />
                </div>

                <div className="relative z-10 flex-1 text-center md:text-left">
                  <span className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Verification Result</span>
                  <h2 className="text-2xl font-black mt-2 mb-4">
                    {verification.chainStatus === "VERIFIED" ? "Integrity Validated" : "Chain Compromised"}
                  </h2>
                  <p className="opacity-70 leading-relaxed m-0 max-w-md">
                    The document has been traced through {verification.chain.length} independent signatures without any
                    modification to the cryptographic payload.
                  </p>
                </div>
              </div>

              {/* Provenance Visualization */}
              <div className="card p-10 bg-base-100">
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-base-300">
                  <h3 className="text-xl font-black text-base-content">Provenance Timeline</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40 bg-base-200 px-2 py-1 rounded">
                    Blockchain Event Log
                  </span>
                </div>

                <div className="relative space-y-12">
                  <div className="absolute left-[31px] top-4 bottom-4 w-0.5 bg-base-300 -z-0" />

                  {verification.chain.map((item, index) => {
                    const isFinal = index === verification.chain.length - 1;
                    return (
                      <div key={item.signatureHash} className="flex gap-8 relative z-10 group">
                        <div
                          className={`h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm ${
                            isFinal
                              ? "bg-primary border-primary text-primary-content shadow-primary/20 scale-110"
                              : "bg-base-100 border-base-300 text-base-content/40 group-hover:border-primary/40 group-hover:text-primary"
                          }`}
                        >
                          <FingerPrintIcon className="h-8 w-8" />
                        </div>

                        <div className="flex-1 py-2">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                            <h4 className="text-lg font-black text-base-content m-0">
                              Signature Execution #{index + 1}
                            </h4>
                            <span className="text-xs font-bold text-base-content/40">{formatDate(item.createdAt)}</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-mono text-xs text-base-content/40">
                              <span className="text-[10px] font-black text-base-content/20">SIG</span>
                              {shortHash(item.signatureHash)}
                            </div>
                            <button
                              onClick={() => setSelectedSignature(item)}
                              className="text-xs font-black text-primary hover:underline w-fit mt-2 flex items-center gap-1"
                            >
                              View Cryptographic Details
                              <ChevronRightIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Technical Sidebar */}
        <aside className="space-y-6">
          {verification && (
            <>
              <div className="card p-8 bg-neutral text-neutral-content overflow-hidden relative border-none">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CubeIcon className="h-24 w-24" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-content/40 mb-6">
                  Technical Parameters
                </h3>
                <div className="space-y-6 relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-neutral-content/60 mb-2">Content Fingerprint</p>
                    <p className="font-mono text-xs break-all text-neutral-content/80 leading-relaxed">
                      {verification.signature.docHash}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-content/60 mb-2">Registry Pointer</p>
                    <p className="font-mono text-xs break-all text-neutral-content/80 leading-relaxed">
                      {verification.signature.txHash}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-neutral-content/10 p-4">
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-content/60">
                        Document Verification
                      </span>
                      <input
                        className="file-input file-input-bordered file-input-primary w-full bg-base-100 text-base-content"
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={event => {
                          setDocumentFile(event.target.files?.[0] || null);
                          setDocumentCheck(null);
                        }}
                      />
                    </label>
                    <button
                      className="btn btn-primary mt-3 h-12 w-full text-sm shadow-xl"
                      disabled={!documentFile}
                      onClick={verifyDocumentFile}
                      type="button"
                    >
                      <DocumentMagnifyingGlassIcon className="mr-2 h-4 w-4" />
                      Verify Document
                    </button>
                  </div>
                </div>
              </div>

              {documentCheck && (
                <div
                  className={`card p-8 ${
                    documentCheck.matchedCount === documentCheck.totalCount
                      ? "border-success/20 bg-success/5"
                      : "border-warning/20 bg-warning/5"
                  }`}
                >
                  <div
                    className={`mb-5 flex items-center gap-3 ${
                      documentCheck.matchedCount === documentCheck.totalCount ? "text-success" : "text-warning"
                    }`}
                  >
                    {documentCheck.matchedCount === documentCheck.totalCount ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <ExclamationTriangleIcon className="h-6 w-6" />
                    )}
                    <h3 className="text-sm font-black text-base-content">Document Match</h3>
                  </div>
                  <p className="mb-4 text-sm text-base-content/60">
                    {documentCheck.matchedCount} of {documentCheck.totalCount} signatures match the uploaded file.
                  </p>
                  <p className="mb-5 font-mono text-xs break-all text-base-content/60">{documentCheck.documentHash}</p>
                  <div className="space-y-2">
                    {documentCheck.results.map((result, index) => (
                      <div key={result.signatureHash} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-base-content/70">Signature #{index + 1}</span>
                        <span className={`badge ${result.matched ? "badge-success" : "badge-warning"}`}>
                          {result.matched ? "Matched" : "Different hash"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card p-8 border-base-300">
                <h3 className="text-sm font-black text-base-content mb-4">Provenance Summary</h3>
                <p className="text-sm text-base-content/60 leading-relaxed mb-6">
                  This document was originally uploaded and signed on the date specified in the first event log. Every
                  subsequent signature strengthens the verification chain.
                </p>
                <div className="flex items-center gap-3 text-success">
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Protocol Version 1.0</span>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      {/* Detail Modal */}
      {selectedSignature && (
        <div className="modal modal-open backdrop-blur-md" role="dialog">
          <div className="modal-box max-w-2xl rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border-none bg-base-100">
            <div className="bg-neutral px-10 py-10 text-neutral-content">
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                  <FingerPrintIcon className="h-6 w-6" />
                </div>
                <button
                  className="btn btn-ghost btn-circle text-neutral-content/40 hover:bg-white/10"
                  onClick={() => setSelectedSignature(null)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <h3 className="text-2xl font-black">Audit Detail</h3>
              <p className="text-neutral-content/40 mt-2 font-mono text-xs">{selectedSignature.signatureHash}</p>
            </div>

            <div className="p-10 space-y-6">
              {[
                ["Document Payload", selectedSignature.docHash, CubeIcon],
                ["Signer Proof (Salted)", selectedSignature.signerWalletHash, FingerPrintIcon],
                ["Blockchain Transaction", selectedSignature.txHash, ArrowTopRightOnSquareIcon],
                ["Timestamp", formatDate(selectedSignature.createdAt), ClockIcon],
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="flex gap-4">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-base-200 flex items-center justify-center text-base-content/40 border border-base-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-1">
                      {label as string}
                    </p>
                    <p className="text-sm font-mono text-base-content break-all m-0">{value as string}</p>
                  </div>
                </div>
              ))}

              <div className="pt-8 flex gap-4">
                <Link
                  href={`/verify/${selectedSignature.signatureHash}/signer`}
                  className="btn btn-primary flex-1 h-14 text-sm font-bold"
                >
                  Verify NDI Identity
                </Link>
                <button className="btn btn-ghost h-14 px-8 font-bold" onClick={() => setSelectedSignature(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop bg-slate-950/40" onClick={() => setSelectedSignature(null)} />
        </div>
      )}
    </main>
  );
};

export default VerifyPage;
