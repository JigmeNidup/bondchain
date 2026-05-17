"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircleIcon, FingerPrintIcon } from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

const OfficerRegisterPage = () => {
  const params = useParams<{ token: string }>();
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setError("");
    try {
      await bondchainFetch(`/agency/officer-invitations/${params.token}/accept`, { method: "POST" });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept invitation");
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-80px)] w-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="rounded-3xl bg-secondary/10 p-5 text-secondary">
        {done ? <CheckCircleIcon className="h-12 w-12" /> : <FingerPrintIcon className="h-12 w-12" />}
      </div>
      <h1 className="mt-8 text-3xl font-black">Agency Officer Registration</h1>
      <p className="mt-4 text-base-content/60">Verify with Bhutan NDI to activate your agency officer account.</p>
      {error && <div className="alert alert-error mt-8">{error}</div>}
      {done ? (
        <div className="alert alert-success mt-8">Officer registration completed.</div>
      ) : (
        <button className="btn btn-secondary mt-10 h-14 px-10" onClick={() => setIsNdiModalOpen(true)}>
          <FingerPrintIcon className="h-5 w-5" />
          Verify with NDI
        </button>
      )}
      <NdiModal isOpen={isNdiModalOpen} onClose={() => setIsNdiModalOpen(false)} onSuccess={accept} />
    </main>
  );
};

export default OfficerRegisterPage;
