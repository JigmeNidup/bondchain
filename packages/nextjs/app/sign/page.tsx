"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

type SigningSession = {
  token: string;
  documentHash: string;
  previousSignatureHash?: string;
  documentName?: string;
  status: string;
};

const SignSurface = () => {
  const params = useSearchParams();
  const token = params.get("session") || "";
  const [session, setSession] = useState<SigningSession | null>(null);
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [ndiVerified, setNdiVerified] = useState(false);
  const [result, setResult] = useState<{ callbackUrl?: string; verificationLink: string; txHash?: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    bondchainFetch<{ session: SigningSession }>(`/api/signing/session/${token}`)
      .then(response => setSession(response.session))
      .catch(err => setError(err instanceof Error ? err.message : "Signing session not found"));
  }, [token]);

  const handleNdiSuccess = () => {
    setNdiVerified(true);
  };

  const sign = async () => {
    if (!session) return;
    setError("");
    setLoading(true);
    try {
      setResult(
        await bondchainFetch<{ callbackUrl?: string; verificationLink: string; txHash?: string }>("/sign/document", {
          method: "POST",
          json: {
            signingSessionToken: session.token,
          },
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-80px)] w-full max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[400px_1fr] lg:px-8">
      {/* Sidebar - Context */}
      <section className="flex flex-col gap-10">
        <div>
          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary bg-primary/5 border border-primary/10 mb-6">
            Official Execution
          </div>
          <h1 className="text-3xl font-black text-base-content leading-tight">
            Authorize <br />
            Signature
          </h1>
          <p className="mt-4 text-base-content/60 leading-relaxed">
            Review the document details and provide your cryptographic signature using Bhutan NDI.
          </p>
        </div>

        <div className="space-y-6">
          <div className="card p-8 bg-base-100 border-base-300">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-base-300">
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 m-0">
                  Document Name
                </p>
                <h3 className="text-lg font-black text-base-content m-0 truncate max-w-[180px]">
                  {session?.documentName || "Official Notesheet"}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">
                  Content Fingerprint
                </p>
                <p className="font-mono text-xs break-all text-base-content/60 leading-relaxed m-0">
                  {session?.documentHash || "Awaiting context..."}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">
                  Current Status
                </p>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${result ? "bg-success" : "bg-warning animate-pulse"}`} />
                  <span className="text-xs font-bold uppercase tracking-widest text-base-content">
                    {result ? "EXECUTION COMPLETE" : session?.status || "WAITING FOR SIGNATURE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Center */}
      <section className="card p-2 shadow-xl bg-base-200/50">
        <div className="card h-full flex flex-col p-8 md:p-12 overflow-hidden bg-base-100 border-none">
          <div className="flex items-center justify-between border-b border-base-300 pb-8 mb-8">
            <h2 className="text-xl font-black text-base-content">Signing Console</h2>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${ndiVerified ? "bg-primary animate-pulse" : "bg-base-300"}`} />
              <span className="text-xs font-bold uppercase tracking-widest text-base-content/40">
                {ndiVerified ? "Identity Unlocked" : "Awaiting Verification"}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {!ndiVerified && (
              <div className="flex flex-col items-center text-center animate-in fade-in duration-700">
                <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary mb-8 shadow-inner border border-primary/10">
                  <FingerPrintIcon className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-base-content">Verification Required</h3>
                <p className="text-base-content/60 mt-4 max-w-sm leading-relaxed">
                  Access to the signing keys requires a valid Bhutan NDI session.
                </p>
                <button
                  className="btn btn-primary mt-10 h-14 w-full max-w-sm text-lg shadow-xl shadow-primary/20"
                  onClick={() => setIsNdiModalOpen(true)}
                  disabled={loading || !session}
                >
                  Authorize Identity
                </button>
              </div>
            )}

            {ndiVerified && !result && (
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="rounded-[2rem] bg-base-200/50 p-10 border border-base-300 text-center">
                  <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center text-success mx-auto mb-6">
                    <ShieldCheckIcon className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-black text-base-content">Identity Confirmed</h3>
                  <p className="text-base-content/60 mt-2 leading-relaxed">
                    Your sovereign identity has been successfully verified. You are now authorized to apply your
                    cryptographic signature to this document.
                  </p>
                </div>
                <button
                  className="btn btn-primary h-14 text-lg shadow-xl shadow-primary/40"
                  onClick={sign}
                  disabled={loading || !session}
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-6 w-6 animate-spin mr-2" />
                      Signing Document...
                    </>
                  ) : (
                    "Execute Cryptographic Signature"
                  )}
                </button>
              </div>
            )}

            {result && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-8 shadow-inner border border-primary/10">
                  <CheckCircleIcon className="h-12 w-12" />
                </div>
                <h3 className="text-3xl font-black text-base-content">Signature Execution Complete</h3>
                <p className="text-base-content/60 mt-4 max-w-sm leading-relaxed mb-10">
                  Your signature has been permanently recorded on-chain. The document&apos;s provenance is now
                  verifiable.
                </p>
                <div className="grid gap-4 w-full mb-10">
                  <div className="card p-6 bg-base-200/50 border-base-300 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">
                      Audit Link
                    </p>
                    <Link
                      href={result.verificationLink}
                      className="font-mono text-sm text-primary font-bold m-0 break-all flex items-center gap-2"
                    >
                      {result.verificationLink}
                      <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {result.callbackUrl && (
                  <a
                    className="btn btn-primary h-14 w-full text-lg shadow-xl shadow-primary/20"
                    href={result.callbackUrl}
                  >
                    Return to Originating Agency
                  </a>
                )}
              </div>
            )}

            {error && (
              <div className="mt-8 rounded-2xl bg-error/5 border border-error/10 p-4 flex items-center gap-3 text-error font-bold animate-in shake duration-500">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <NdiModal
        isOpen={isNdiModalOpen}
        onClose={() => setIsNdiModalOpen(false)}
        onSuccess={handleNdiSuccess}
        title="Authorize Signing"
      />
    </main>
  );
};

const SignPage = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }
  >
    <SignSurface />
  </Suspense>
);

export default SignPage;
