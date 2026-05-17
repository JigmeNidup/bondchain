"use client";

import { useState } from "react";
import Link from "next/link";
import { keccak256 } from "viem";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type DocumentSignature = {
  docHash: string;
  signerWalletHash: string;
  payloadHash: string;
  previousSignatureHash: string;
  signatureHash: string;
  txHash: string;
  createdAt: string;
  verificationLink: string;
};

type DocumentVerification = {
  docHash: string;
  signatureCount: number;
  signatures: DocumentSignature[];
  document?: {
    ipfsGatewayUrl: string;
    fileName?: string | null;
    createdAt: string;
  } | null;
};

const shortHash = (value: string) => (value.length > 20 ? `${value.slice(0, 12)}...${value.slice(-10)}` : value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const DocumentHashVerificationPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DocumentVerification | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyDocument = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const docHash = keccak256(bytes);
      const response = await bondchainFetch<DocumentVerification>(`/verify/document/${docHash}`);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify document hash");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="mb-10 border-b border-base-300 pb-8">
        <div className="mb-4 inline-flex rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
          Document Hash Verification
        </div>
        <h1 className="text-3xl font-black text-base-content">Find Signatures For A Document</h1>
        <p className="mt-3 max-w-2xl text-base-content/60">
          Upload a document produced by BondChain. The browser computes its hash and lists every signature recorded for
          that exact document hash.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <div className="card bg-base-100 p-6 shadow-sm">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <DocumentMagnifyingGlassIcon className="h-7 w-7" />
          </div>
          <label className="form-control">
            <span className="label-text mb-2 font-bold">Document file</span>
            <input
              className="file-input file-input-bordered file-input-primary w-full"
              type="file"
              accept="application/pdf,.pdf"
              onChange={event => {
                setFile(event.target.files?.[0] || null);
                setResult(null);
                setError("");
              }}
            />
          </label>
          <button className="btn btn-primary mt-5 w-full" disabled={!file || loading} onClick={verifyDocument}>
            {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <ShieldCheckIcon className="h-5 w-5" />}
            Verify Document
          </button>

          {error && (
            <div className="alert alert-warning mt-5">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {!result && !loading && (
            <div className="card flex min-h-72 items-center justify-center border-2 border-dashed border-base-300 bg-base-100 p-8 text-center">
              <FingerPrintIcon className="mb-4 h-10 w-10 text-base-content/30" />
              <p className="max-w-md text-base-content/60">
                The signing history appears here after the document hash is computed.
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="card bg-base-100 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3 text-success">
                  <CheckCircleIcon className="h-6 w-6" />
                  <h2 className="text-lg font-black text-base-content">Computed Hash</h2>
                </div>
                <p className="break-all font-mono text-sm text-base-content/70">{result.docHash}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="badge badge-primary">{result.signatureCount} signatures</span>
                  {result.document?.fileName && <span className="badge badge-ghost">{result.document.fileName}</span>}
                </div>
              </div>

              {result.signatures.length > 0 ? (
                <div className="card bg-base-100 p-6 shadow-sm">
                  <h2 className="mb-6 text-xl font-black">Signing Records</h2>
                  <div className="space-y-4">
                    {result.signatures.map((signature, index) => (
                      <div key={signature.signatureHash} className="rounded-xl border border-base-300 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-black">Signature #{index + 1}</p>
                            <p className="mt-1 flex items-center gap-2 text-xs text-base-content/50">
                              <ClockIcon className="h-4 w-4" />
                              {formatDate(signature.createdAt)}
                            </p>
                          </div>
                          <Link href={signature.verificationLink} className="btn btn-sm btn-primary">
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            Open Chain
                          </Link>
                        </div>
                        <div className="mt-4 grid gap-3 text-xs md:grid-cols-2">
                          <div>
                            <p className="font-bold uppercase tracking-widest text-base-content/40">Signature Hash</p>
                            <p className="break-all font-mono text-base-content/70">{signature.signatureHash}</p>
                          </div>
                          <div>
                            <p className="font-bold uppercase tracking-widest text-base-content/40">Previous Hash</p>
                            <p className="break-all font-mono text-base-content/70">
                              {shortHash(signature.previousSignatureHash)}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold uppercase tracking-widest text-base-content/40">Signer Hash</p>
                            <p className="break-all font-mono text-base-content/70">
                              {shortHash(signature.signerWalletHash)}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold uppercase tracking-widest text-base-content/40">Transaction</p>
                            <p className="break-all font-mono text-base-content/70">{shortHash(signature.txHash)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="alert">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span>No signatures are recorded for this document hash.</span>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default DocumentHashVerificationPage;
