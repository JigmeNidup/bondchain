"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowPathIcon, CheckCircleIcon, FingerPrintIcon } from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type ProofRequest = {
  proofRequestThreadId: string;
  proofRequestURL: string;
  deepLinkURL: string;
};

type SessionStatus = {
  status: "PENDING" | "VERIFIED" | "FAILED";
  didKey?: string;
  user?: { privyWalletAddress: string; linkageHash: string } | null;
};

type OnboardResult = {
  created: boolean;
  txHash?: string;
  user: {
    didKey: string;
    privyWalletAddress: string;
    linkageHash: string;
  };
};

const OnboardPage = () => {
  const [proof, setProof] = useState<ProofRequest | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [onboarded, setOnboarded] = useState<OnboardResult | null>(null);
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

  const onboard = async () => {
    setError("");
    setLoading(true);
    try {
      setOnboarded(await bondchainFetch<OnboardResult>("/onboard", { method: "POST" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!proof || status?.status === "VERIFIED") return;

    const timer = window.setInterval(async () => {
      try {
        const nextStatus = await bondchainFetch<SessionStatus>(`/auth/ndi/status/${proof.proofRequestThreadId}`);
        setStatus(nextStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to read NDI status");
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [proof, status?.status]);

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <p className="m-0 text-sm font-semibold uppercase text-primary">Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">Bind an NDI identity to a Privy wallet</h1>
        <div className="mt-6 grid gap-3">
          {["NDI proof", "Privy wallet", "Sepolia linkage"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-base-300 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                {index + 1}
              </span>
              <span className="font-medium">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="m-0 text-xl font-semibold">NDI login</h2>
            <p className="m-0 mt-1 text-sm text-base-content/70">{status?.didKey || "No active NDI session"}</p>
          </div>
          <FingerPrintIcon className="h-7 w-7 text-primary" />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {!proof && (
            <button className="btn btn-primary min-h-11 rounded-lg" onClick={startLogin} disabled={loading}>
              {loading && <span className="loading loading-spinner loading-sm" />}
              Start NDI login
            </button>
          )}

          {proof && (
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex aspect-square items-center justify-center rounded-lg border border-base-300 bg-white p-4">
                <QRCodeSVG value={proof.proofRequestURL} size={180} />
              </div>
              <div className="flex flex-col justify-between gap-4">
                <div className="rounded-lg bg-base-200 p-4">
                  <p className="m-0 text-sm font-medium">Status</p>
                  <p className="m-0 mt-1 text-lg font-semibold">{status?.status || "PENDING"}</p>
                </div>
                <a className="btn btn-outline min-h-11 rounded-lg" href={proof.deepLinkURL}>
                  Open NDI Wallet
                </a>
              </div>
            </div>
          )}

          {status?.status === "VERIFIED" && !onboarded && (
            <button className="btn btn-primary min-h-11 rounded-lg" onClick={onboard} disabled={loading}>
              {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckCircleIcon className="h-4 w-4" />}
              Complete wallet binding
            </button>
          )}

          {onboarded && (
            <div className="rounded-lg border border-success/40 bg-success/10 p-4">
              <p className="m-0 font-semibold">Onboarding complete</p>
              <p className="mt-2 break-all text-sm">Wallet: {onboarded.user.privyWalletAddress}</p>
              <p className="mt-2 break-all text-sm">Linkage hash: {onboarded.user.linkageHash}</p>
              {onboarded.txHash && <p className="mt-2 break-all text-sm">Tx: {onboarded.txHash}</p>}
            </div>
          )}

          {error && <div className="alert alert-error rounded-lg text-sm">{error}</div>}
        </div>
      </section>
    </main>
  );
};

export default OnboardPage;
