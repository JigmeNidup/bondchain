"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircleIcon, DocumentTextIcon, FingerPrintIcon } from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type SigningSession = {
  token: string;
  documentHash: string;
  previousSignatureHash?: string;
  documentName?: string;
  status: string;
};

type ProofRequest = {
  proofRequestThreadId: string;
  proofRequestURL: string;
  deepLinkURL: string;
};

const SignSurface = () => {
  const params = useSearchParams();
  const token = params.get("session") || "";
  const [session, setSession] = useState<SigningSession | null>(null);
  const [proof, setProof] = useState<ProofRequest | null>(null);
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

  useEffect(() => {
    if (!proof || ndiVerified) return;

    const timer = window.setInterval(async () => {
      try {
        const status = await bondchainFetch<{ status: string }>(`/auth/ndi/status/${proof.proofRequestThreadId}`);
        if (status.status === "VERIFIED") setNdiVerified(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify NDI session");
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [proof, ndiVerified]);

  const startLogin = async () => {
    setError("");
    setLoading(true);
    try {
      setProof(await bondchainFetch<ProofRequest>("/auth/ndi/initiate", { method: "POST" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start NDI login");
    } finally {
      setLoading(false);
    }
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
    <main className="mx-auto grid min-h-dvh w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <DocumentTextIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold uppercase text-primary">Signing overlay</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              {session?.documentName || "Notesheet document"}
            </h1>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-base-200 p-4">
          <p className="m-0 text-sm text-base-content/65">Document hash</p>
          <p className="mt-2 break-all font-mono text-sm">{session?.documentHash || "No session selected"}</p>
        </div>

        <div className="mt-4 rounded-lg border border-base-300 p-4">
          <p className="m-0 text-sm text-base-content/65">Status</p>
          <p className="m-0 mt-1 font-semibold">{result ? "SIGNED" : session?.status || "PENDING"}</p>
        </div>
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-xl font-semibold">Authorization</h2>
          <FingerPrintIcon className="h-6 w-6 text-primary" />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {!ndiVerified && !proof && (
            <button className="btn btn-primary min-h-11 rounded-lg" onClick={startLogin} disabled={loading || !session}>
              Start NDI login
            </button>
          )}

          {!ndiVerified && proof && (
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex aspect-square items-center justify-center rounded-lg border border-base-300 bg-white p-4">
                <QRCodeSVG value={proof.proofRequestURL} size={180} />
              </div>
              <div className="flex flex-col justify-between gap-4">
                <div className="rounded-lg bg-base-200 p-4">
                  <p className="m-0 text-sm font-medium">NDI status</p>
                  <p className="m-0 mt-1 text-lg font-semibold">PENDING</p>
                </div>
                <a className="btn btn-outline min-h-11 rounded-lg" href={proof.deepLinkURL}>
                  Open NDI Wallet
                </a>
              </div>
            </div>
          )}

          {ndiVerified && !result && (
            <button className="btn btn-primary min-h-11 rounded-lg" onClick={sign} disabled={loading || !session}>
              {loading && <span className="loading loading-spinner loading-sm" />}
              Sign document
            </button>
          )}

          {result && (
            <div className="rounded-lg border border-success/40 bg-success/10 p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-success" />
                <p className="m-0 font-semibold">Signature recorded</p>
              </div>
              <a className="link mt-3 block break-all text-sm" href={result.verificationLink}>
                {result.verificationLink}
              </a>
              {result.callbackUrl && (
                <a className="btn btn-outline mt-4 min-h-11 rounded-lg" href={result.callbackUrl}>
                  Return to agency app
                </a>
              )}
            </div>
          )}

          {error && <div className="alert alert-error rounded-lg text-sm">{error}</div>}
        </div>
      </section>
    </main>
  );
};

const SignPage = () => (
  <Suspense fallback={<main className="min-h-dvh p-8">Loading signing session...</main>}>
    <SignSurface />
  </Suspense>
);

export default SignPage;
