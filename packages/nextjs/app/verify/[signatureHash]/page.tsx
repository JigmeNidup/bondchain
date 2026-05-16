"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FingerPrintIcon, ShieldCheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
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

const shortHash = (value: string) => (value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value);

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const VerifyPage = () => {
  const params = useParams<{ signatureHash: string }>();
  const signatureHash = params.signatureHash;
  const [verification, setVerification] = useState<Verification | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<SignatureChainItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!signatureHash) return;
    bondchainFetch<Verification>(`/verify/${signatureHash}`)
      .then(setVerification)
      .catch(err => setError(err instanceof Error ? err.message : "Verification failed"));
  }, [signatureHash]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/15">
            <ShieldCheckIcon className="h-7 w-7 text-success" />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold uppercase text-primary">Public verification</p>
            <h1 className="mt-1 text-2xl font-semibold">Signature record</h1>
          </div>
        </div>

        {error && <div className="alert alert-error mt-6 rounded-lg text-sm">{error}</div>}

        {!verification && !error && <div className="loading loading-spinner loading-md mt-8" />}

        {verification && (
          <div className="mt-6 grid gap-3">
            {[
              ["Signature hash", verification.signature.signatureHash],
              ["Document hash", verification.signature.docHash],
              ["Payload hash", verification.signature.payloadHash],
              ["Previous signature hash", verification.signature.previousSignatureHash],
              ["Hashed signer wallet", verification.signature.signerWalletHash],
              ["Sepolia tx", verification.signature.txHash],
              ["IPFS CID", verification.document?.ipfsCid || "External document"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-base-300 p-4">
                <p className="m-0 text-sm text-base-content/65">{label}</p>
                <p className="m-0 mt-2 break-all font-mono text-sm">{value}</p>
              </div>
            ))}

            <div
              className={`mt-3 rounded-lg border p-4 ${
                verification.chainStatus === "VERIFIED"
                  ? "border-success/40 bg-success/10"
                  : "border-error/40 bg-error/10"
              }`}
            >
              <p className="m-0 font-semibold">
                {verification.chainStatus === "VERIFIED" ? "Signature chain verified" : "Signature chain broken"}
              </p>
              {verification.brokenAt && (
                <p className="m-0 mt-2 break-all text-sm">Missing link: {verification.brokenAt}</p>
              )}
            </div>

            <div className="mt-3 grid gap-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="m-0 text-xl font-semibold">Signature chain</h2>
                <p className="m-0 text-sm text-base-content/65">{verification.chain.length} linked signatures</p>
              </div>

              <div className="overflow-x-auto pb-3">
                <ol className="flex min-w-max items-start px-1 py-2">
                  {verification.chain.map((item, index) => {
                    const isFinal = index === verification.chain.length - 1;

                    return (
                      <li key={item.signatureHash} className="flex items-start">
                        <button
                          type="button"
                          onClick={() => setSelectedSignature(item)}
                          className="group flex w-36 flex-col items-center gap-3 rounded-lg p-2 text-center outline-none transition hover:bg-base-200 focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Open details for signature ${index + 1}`}
                        >
                          <span
                            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                              isFinal
                                ? "border-primary bg-primary text-primary-content"
                                : "border-success bg-success/15 text-success"
                            } group-hover:scale-105`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-sm font-semibold">Signature {index + 1}</span>
                          <span className="max-w-full break-all font-mono text-[11px] leading-4 text-base-content/65">
                            {shortHash(item.signatureHash)}
                          </span>
                        </button>

                        {!isFinal && (
                          <div className="flex h-12 w-20 items-center" aria-hidden="true">
                            <span className="h-0.5 w-full bg-base-300" />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            {selectedSignature && (
              <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="signature-modal-title">
                <div className="modal-box max-w-2xl rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="m-0 text-sm font-semibold uppercase text-primary">Signature details</p>
                      <h3 id="signature-modal-title" className="mt-1 text-xl font-semibold">
                        Signature{" "}
                        {verification.chain.findIndex(item => item.signatureHash === selectedSignature.signatureHash) +
                          1}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm min-h-11 rounded-lg"
                      onClick={() => setSelectedSignature(null)}
                      aria-label="Close signature details"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {[
                      ["Signature hash", selectedSignature.signatureHash],
                      ["Document hash", selectedSignature.docHash],
                      ["Payload hash", selectedSignature.payloadHash],
                      ["Previous signature hash", selectedSignature.previousSignatureHash],
                      ["Hashed signer wallet", selectedSignature.signerWalletHash],
                      ["Sepolia tx", selectedSignature.txHash],
                      ["Signed at", formatDate(selectedSignature.createdAt)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-base-300 p-3">
                        <p className="m-0 text-sm text-base-content/65">{label}</p>
                        <p className="m-0 mt-1 break-all font-mono text-sm">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="modal-action">
                    <Link
                      href={`/verify/${selectedSignature.signatureHash}/signer`}
                      className="btn btn-outline min-h-11 rounded-lg"
                    >
                      <FingerPrintIcon className="h-4 w-4" />
                      Verify signer with NDI
                    </Link>
                    <button
                      type="button"
                      className="btn min-h-11 rounded-lg"
                      onClick={() => setSelectedSignature(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-backdrop"
                  onClick={() => setSelectedSignature(null)}
                  aria-label="Close signature details"
                />
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default VerifyPage;
