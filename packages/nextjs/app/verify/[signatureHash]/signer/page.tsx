"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircleIcon, FingerPrintIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type ProofRequest = {
  proofRequestThreadId: string;
  proofRequestURL: string;
  deepLinkURL: string;
};

type NDIStatus = {
  status: "PENDING" | "VERIFIED" | "FAILED";
  didKey?: string;
};

type SignerVerification = {
  verified: boolean;
  didKey: string;
  signerWalletHash: string;
  resolvedWalletHash: string;
  signatureHash: string;
};

const VerifySignerPage = () => {
  const params = useParams<{ signatureHash: string }>();
  const signatureHash = params.signatureHash;
  const [proof, setProof] = useState<ProofRequest | null>(null);
  const [status, setStatus] = useState<NDIStatus | null>(null);
  const [verification, setVerification] = useState<SignerVerification | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await bondchainFetch<ProofRequest>("/auth/ndi/initiate", { method: "POST" });
      setProof(result);
      setStatus({ status: "PENDING" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start NDI login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!proof || verification) return;

    const timer = window.setInterval(async () => {
      try {
        const nextStatus = await bondchainFetch<NDIStatus>(`/auth/ndi/status/${proof.proofRequestThreadId}`);
        setStatus(nextStatus);
        if (nextStatus.status === "VERIFIED") {
          const result = await bondchainFetch<SignerVerification>(`/verify/${signatureHash}/signer`);
          setVerification(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify signer");
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [proof, signatureHash, verification]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
            <FingerPrintIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold uppercase text-primary">NDI signer verification</p>
            <h1 className="mt-1 text-2xl font-semibold">Confirm signer identity</h1>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-base-200 p-4">
          <p className="m-0 text-sm text-base-content/65">Signature hash</p>
          <p className="mt-2 break-all font-mono text-sm">{signatureHash}</p>
        </div>

        {!proof && !verification && (
          <button className="btn btn-primary mt-6 min-h-11 rounded-lg" onClick={startLogin} disabled={loading}>
            {loading && <span className="loading loading-spinner loading-sm" />}
            Login with NDI to verify signer
          </button>
        )}

        {proof && !verification && (
          <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="flex aspect-square items-center justify-center rounded-lg border border-base-300 bg-white p-4">
              <QRCodeSVG value={proof.proofRequestURL} size={180} />
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div className="rounded-lg bg-base-200 p-4">
                <p className="m-0 text-sm font-medium">NDI status</p>
                <p className="m-0 mt-1 text-lg font-semibold">{status?.status || "PENDING"}</p>
              </div>
              <a className="btn btn-outline min-h-11 rounded-lg" href={proof.deepLinkURL}>
                Open NDI Wallet
              </a>
            </div>
          </div>
        )}

        {verification && (
          <div
            className={`mt-6 rounded-lg border p-5 ${
              verification.verified ? "border-success/40 bg-success/10" : "border-error/40 bg-error/10"
            }`}
          >
            <div className="flex items-center gap-3">
              {verification.verified ? (
                <CheckCircleIcon className="h-6 w-6 text-success" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-error" />
              )}
              <p className="m-0 text-lg font-semibold">
                {verification.verified ? "Signer verified" : "Signer does not match"}
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              <div>
                <p className="m-0 text-sm text-base-content/65">On-chain signer hash</p>
                <p className="mt-1 break-all font-mono text-sm">{verification.signerWalletHash}</p>
              </div>
              <div>
                <p className="m-0 text-sm text-base-content/65">NDI wallet hash</p>
                <p className="mt-1 break-all font-mono text-sm">{verification.resolvedWalletHash}</p>
              </div>
            </div>
          </div>
        )}

        {error && <div className="alert alert-error mt-6 rounded-lg text-sm">{error}</div>}

        <Link href={`/verify/${signatureHash}`} className="btn btn-ghost mt-6 min-h-11 rounded-lg">
          Back to signature
        </Link>
      </section>
    </main>
  );
};

export default VerifySignerPage;
