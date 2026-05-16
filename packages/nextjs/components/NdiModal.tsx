"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type ProofRequest = {
  proofRequestThreadId: string;
  proofRequestURL: string;
  deepLinkURL: string;
};

type NdiModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (didKey: string) => void;
  title?: string;
};

export const NdiModal = ({ isOpen, onClose, onSuccess }: NdiModalProps) => {
  const [proof, setProof] = useState<ProofRequest | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "verifying" | "success" | "error" | "expired">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && status === "idle") {
      initiateLogin();
    }
  }, [isOpen]);

  const initiateLogin = async () => {
    setError("");
    setLoading(true);
    setStatus("idle");
    try {
      const result = await bondchainFetch<ProofRequest>("/auth/ndi/initiate", { method: "POST" });
      setProof(result);
      setStatus("waiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start NDI login");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!proof || status !== "waiting") return;

    const timer = window.setInterval(async () => {
      try {
        const nextStatus = await bondchainFetch<{ status: string; didKey?: string }>(
          `/auth/ndi/status/${proof.proofRequestThreadId}`,
        );
        if (nextStatus.status === "VERIFIED") {
          setStatus("success");
          window.clearInterval(timer);
          setTimeout(() => {
            onSuccess(nextStatus.didKey || "");
            onClose();
          }, 1500);
        } else if (nextStatus.status === "FAILED") {
          setStatus("error");
          window.clearInterval(timer);
        }
      } catch {
        // Silently retry polling
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [proof, status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed & Blurred Background */}
      <div className="absolute inset-0 bg-base-300/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-[24px] bg-base-100 shadow-2xl transition-all border border-base-300">
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-start">
          <h3 className="text-2xl font-bold text-base-content leading-tight">
            {status === "success" ? (
              "Verification Complete"
            ) : (
              <>
                <span className="sm:hidden">
                  Login with <span className="text-success">Bhutan NDI</span>
                </span>
                <span className="hidden sm:inline">
                  Scan with <span className="text-success">Bhutan NDI</span> wallet
                </span>
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-base-content/40 hover:bg-base-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 pt-0 flex flex-col items-center">
          {loading && status === "idle" && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="h-10 w-10 border-4 border-success border-t-transparent rounded-full animate-spin" />
              <p className="text-base-content/60 font-medium">Securing session...</p>
            </div>
          )}

          {status === "waiting" && proof && (
            <>
              {/* Desktop View: QR Focus */}
              <div className="hidden sm:flex flex-col items-center">
                <div className="relative p-6 bg-white border-2 border-success rounded-[20px] shadow-sm mb-8">
                  <QRCodeSVG value={proof.proofRequestURL} size={220} level="H" includeMargin={false} />
                  {/* BondChain Logo Badge in Center */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-10 w-10 p-1 rounded-full overflow-hidden relative">
                      <Image
                        src="/logo.png"
                        alt="BondChain"
                        fill
                        className="object-cover transition-all dark:invert dark:brightness-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-left w-full space-y-3">
                  <div className="flex gap-4 items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success text-sm font-bold">
                      1
                    </span>
                    <p className="text-base-content/70 m-0">
                      Open <span className="font-bold">Bhutan NDI</span> on your phone
                    </p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success text-sm font-bold">
                      2
                    </span>
                    <p className="text-base-content/70 m-0">
                      Tap the <span className="font-bold">Scan</span> button and capture the code
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile View: Button Focus */}
              <div className="sm:hidden flex flex-col items-center w-full">
                <div className="h-24 w-24 bg-success/10 rounded-[24px] flex items-center justify-center mb-8 overflow-hidden relative">
                  <Image
                    src="/logo.png"
                    alt="BondChain"
                    fill
                    className="object-cover p-4 transition-all dark:invert dark:brightness-200"
                  />
                </div>

                <p className="text-base-content/60 text-center mb-8 px-4 leading-relaxed">
                  Tap the button below to authenticate using your{" "}
                  <span className="font-semibold text-base-content">NDI Wallet</span> app.
                </p>

                <a
                  href={proof.deepLinkURL}
                  className="w-full btn bg-success hover:bg-success/80 text-success-content border-none h-14 rounded-xl font-bold flex gap-3 shadow-lg"
                >
                  <div className="h-6 w-6 rounded-full flex items-center justify-center overflow-hidden relative">
                    <Image
                      src="/logo.png"
                      alt="BondChain"
                      fill
                      className="object-cover transition-all dark:invert dark:brightness-200"
                    />
                  </div>
                  Open NDI Wallet
                </a>
              </div>
            </>
          )}

          {status === "verifying" && (
            <div className="py-12 flex flex-col items-center">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-success/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-success border-t-transparent rounded-full animate-spin" />
                <div className="h-16 w-16 rounded-full flex items-center justify-center shadow-lg overflow-hidden relative">
                  <Image
                    src="/logo.png"
                    alt="BondChain"
                    fill
                    className="object-cover p-2 transition-all dark:invert dark:brightness-200"
                  />
                </div>
              </div>
              <p className="mt-8 text-base-content font-bold">Authenticating Identity...</p>
              <p className="mt-1 text-base-content/40 text-sm italic">Waiting for Bhutan NDI network</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="h-24 w-24 bg-success/10 rounded-full flex items-center justify-center mb-8">
                <CheckCircleIcon className="h-16 w-16 text-success" />
              </div>
              <h4 className="text-2xl font-bold text-base-content mb-2">Authenticated</h4>
              <p className="text-base-content/60 leading-relaxed">
                Your identity has been successfully verified.
                <br />
                Returning to your session...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="py-8 flex flex-col items-center w-full">
              <div className="h-16 w-16 bg-error/10 rounded-full flex items-center justify-center mb-6">
                <ExclamationTriangleIcon className="h-10 w-10 text-error" />
              </div>
              <div className="bg-error/10 border border-error/20 rounded-xl p-4 w-full mb-8">
                <p className="text-error font-medium m-0 text-sm text-center">
                  {error || "Verification failed. Please try again."}
                </p>
              </div>
              <button
                onClick={initiateLogin}
                className="btn btn-neutral w-full h-14 rounded-xl font-bold transition-all shadow-lg"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Status Indicator Bar */}
        {(status === "waiting" || status === "verifying") && (
          <div className="bg-base-200 py-3 flex items-center justify-center gap-2 border-t border-base-300">
            <span className="h-1.5 w-1.5 bg-success rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">
              Live Connection Established
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
