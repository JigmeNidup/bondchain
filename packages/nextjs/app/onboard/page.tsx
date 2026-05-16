"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, FingerPrintIcon } from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

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
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [didKey, setDidKey] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState<OnboardResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNdiSuccess = (did: string) => {
    setDidKey(did);
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

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-80px)] w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[400px_1fr] lg:px-8">
      {/* Sidebar Guidance */}
      <section className="flex flex-col gap-10">
        <div>
          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary bg-primary/5 border border-primary/10 mb-6">
            Identity Provisioning
          </div>
          <h1 className="text-3xl font-black text-base-content leading-tight">
            Link Your <br />
            Sovereign ID
          </h1>
          <p className="mt-4 text-base-content/60 leading-relaxed">
            Create a permanent cryptographic link between your national identity and the decentralized web.
          </p>
        </div>

        <div className="flex flex-col gap-6 relative">
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-base-300 -z-10" />
          {[
            { title: "Authentication", copy: "Verify your Bhutan NDI via secure OIDC.", icon: FingerPrintIcon },
            { title: "Provisioning", copy: "Initialize your non-custodial signer wallet.", icon: ArrowPathIcon },
            { title: "Verification", copy: "Record the linkage on the public ledger.", icon: CheckCircleIcon },
          ].map((item, index) => {
            const isDone = index === 0 ? !!didKey : index === 1 ? !!onboarded : false;
            const isCurrent = index === 0 ? !didKey : index === 1 ? didKey && !onboarded : onboarded && index === 2;

            return (
              <div
                key={item.title}
                className={`flex gap-6 items-start transition-all duration-500 ${isCurrent ? "scale-105 opacity-100" : "opacity-50"}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isDone
                      ? "bg-primary border-primary text-primary-content"
                      : isCurrent
                        ? "bg-base-100 border-primary text-primary shadow-sm"
                        : "bg-base-100 border-base-300 text-base-content/40"
                  }`}
                >
                  {isDone ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </span>
                <div>
                  <h3 className={`text-base font-bold m-0 ${isCurrent ? "text-base-content" : "text-base-content/60"}`}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-base-content/40 mt-1 m-0 leading-relaxed">{item.copy}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Action Center */}
      <section className="card p-2 shadow-xl bg-base-200/50">
        <div className="card h-full flex flex-col p-8 md:p-12 overflow-hidden bg-base-100 border-none">
          <div className="flex items-center justify-between border-b border-base-300 pb-8 mb-8">
            <div>
              <h2 className="text-xl font-black text-base-content">Provisioning Center</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`h-2 w-2 rounded-full ${didKey ? "bg-primary animate-pulse" : "bg-base-300"}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-base-content/40">
                  {didKey ? "Secure Session Active" : "Waiting for identity"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {!didKey && (
              <div className="flex flex-col items-center text-center animate-in fade-in duration-700">
                <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary mb-8 shadow-inner border border-primary/10">
                  <FingerPrintIcon className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-base-content">Identity Required</h3>
                <p className="text-base-content/60 mt-4 max-w-sm leading-relaxed">
                  To continue, you must authenticate using your official Bhutan NDI wallet app.
                </p>
                <button
                  className="btn btn-primary mt-10 h-14 w-full max-w-sm text-lg shadow-lg shadow-primary/20"
                  onClick={() => setIsNdiModalOpen(true)}
                  disabled={loading}
                >
                  Verify Bhutan NDI
                </button>
              </div>
            )}

            {didKey && !onboarded && (
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="rounded-[2rem] bg-base-200/50 p-8 border border-base-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircleIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-base-content m-0">Identity Verified</h4>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">
                        Session: {didKey.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                  <p className="text-base-content/60 leading-relaxed mb-0">
                    Your sovereign identity has been successfully validated. You are now ready to provision your
                    non-custodial wallet and record the linkage on-chain.
                  </p>
                </div>
                <button
                  className="btn btn-primary h-14 text-lg shadow-lg shadow-primary/20"
                  onClick={onboard}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                      Provisioning...
                    </>
                  ) : (
                    "Complete Onboarding"
                  )}
                </button>
              </div>
            )}

            {onboarded && (
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center text-primary mx-auto mb-6">
                    <CheckCircleIcon className="h-10 w-10" />
                  </div>
                  <h3 className="text-3xl font-black text-base-content">Success!</h3>
                  <p className="text-base-content/60 mt-2">Your digital identity link is now active.</p>
                </div>

                <div className="grid gap-4">
                  <div className="card p-6 border-base-300 bg-base-200/50 hover:bg-base-100 transition-colors">
                    <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">
                      Signer Wallet
                    </p>
                    <p className="break-all font-mono text-sm text-primary font-bold m-0">
                      {onboarded.user.privyWalletAddress}
                    </p>
                  </div>

                  <div className="card p-6 border-base-300 bg-base-200/50 hover:bg-base-100 transition-colors">
                    <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">
                      Linkage Proof (Sepolia)
                    </p>
                    <p className="break-all font-mono text-sm text-base-content/70 m-0">{onboarded.user.linkageHash}</p>
                  </div>

                  {onboarded.txHash && (
                    <div className="card p-6 border-primary/20 bg-primary/5 group">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Audit Hash</p>
                      <p className="break-all font-mono text-sm text-primary m-0">{onboarded.txHash}</p>
                    </div>
                  )}
                </div>

                <Link href="/history" className="btn btn-outline h-14 text-lg border-2">
                  View Audit History
                </Link>
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

      <NdiModal isOpen={isNdiModalOpen} onClose={() => setIsNdiModalOpen(false)} onSuccess={handleNdiSuccess} />
    </main>
  );
};

export default OnboardPage;
