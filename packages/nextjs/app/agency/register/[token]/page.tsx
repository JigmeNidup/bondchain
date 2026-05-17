"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircleIcon, FingerPrintIcon } from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

const AgencyAdminRegisterPage = () => {
  const params = useParams<{ token: string }>();
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");

  const accept = async () => {
    setError("");
    try {
      const response = await bondchainFetch<{ agency: { name: string } }>(
        `/agency/invitations/${params.token}/accept`,
        {
          method: "POST",
        },
      );
      setResult(`Registered as agency admin for ${response.agency.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept invitation");
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-80px)] w-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="rounded-3xl bg-secondary/10 p-5 text-secondary">
        {result ? <CheckCircleIcon className="h-12 w-12" /> : <FingerPrintIcon className="h-12 w-12" />}
      </div>
      <h1 className="mt-8 text-3xl font-black">Agency Admin Registration</h1>
      <p className="mt-4 text-base-content/60">
        Verify with Bhutan NDI to bind this invitation to the intended agency admin CID.
      </p>
      {error && <div className="alert alert-error mt-8">{error}</div>}
      {result ? (
        <div className="alert alert-success mt-8">{result}</div>
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

export default AgencyAdminRegisterPage;
