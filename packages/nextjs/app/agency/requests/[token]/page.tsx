"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowPathIcon, CheckCircleIcon, FingerPrintIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

type ActionResponse = {
  step: {
    role: string;
    status: string;
    request: {
      status: string;
      metadataJson: string;
      service: { name: string; agency: { name: string } };
      steps: { stepNumber: number; role: string; status: string; member: { email: string } }[];
    };
  };
  document?: { ipfsGatewayUrl: string; docHash: string; fileName?: string | null } | null;
  certificate?: { ipfsGatewayUrl: string; fileName?: string | null } | null;
};

const AgencyRequestActionPage = () => {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<ActionResponse | null>(null);
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await bondchainFetch<ActionResponse>(`/agency/requests/${params.token}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load request");
    }
  }, [params.token]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async () => {
    setLoading(true);
    setError("");
    try {
      await bondchainFetch(`/agency/requests/${params.token}/approve`, { method: "POST" });
      setResult("Workflow step completed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete step");
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    setLoading(true);
    setError("");
    try {
      await bondchainFetch(`/agency/requests/${params.token}/reject`, { method: "POST", json: { reason } });
      setResult("Request rejected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject request");
    } finally {
      setLoading(false);
    }
  };

  const issue = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      await bondchainFetch(`/agency/requests/${params.token}/issue`, { method: "POST", body: form });
      setResult("Certificate issued and credential offer created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to issue certificate");
    } finally {
      setLoading(false);
    }
  };

  const role = data?.step.role;

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 border-b border-base-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-secondary/10 bg-secondary/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary">
            {role || "Agency"} action
          </div>
          <h1 className="text-3xl font-black">{data?.step.request.service.name || "Agency Request"}</h1>
          <p className="mt-3 text-base-content/60">{data?.step.request.service.agency.name}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setIsNdiModalOpen(true)}>
          <FingerPrintIcon className="h-5 w-5" />
          NDI Login
        </button>
      </div>

      {error && <div className="alert alert-error mb-6">{error}</div>}
      {result && <div className="alert alert-success mb-6">{result}</div>}

      {data && (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <section className="card bg-base-100 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-black">Submission</h2>
            <pre className="mb-6 whitespace-pre-wrap rounded-2xl bg-base-200 p-4 text-sm">
              {JSON.stringify(JSON.parse(data.step.request.metadataJson || "{}"), null, 2)}
            </pre>
            {data.document && (
              <iframe
                className="h-[560px] w-full rounded-2xl border border-base-300"
                src={data.document.ipfsGatewayUrl}
              />
            )}
          </section>

          <aside className="space-y-6">
            <div className="card bg-base-100 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-black">Workflow</h2>
              <div className="space-y-3">
                {data.step.request.steps.map(step => (
                  <div key={step.stepNumber} className="rounded-xl bg-base-200 p-3">
                    <p className="font-bold">
                      {step.stepNumber}. {step.role}
                    </p>
                    <p className="text-xs text-base-content/50">{step.member.email}</p>
                    <span className="badge badge-ghost mt-2">{step.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card bg-base-100 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-black">Action</h2>
              {role === "ISSUER" ? (
                <>
                  <input
                    className="file-input file-input-bordered mb-4 w-full"
                    type="file"
                    accept="application/pdf"
                    onChange={event => setFile(event.target.files?.[0] || null)}
                  />
                  <button className="btn btn-primary w-full" onClick={issue} disabled={!file || loading}>
                    {loading ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircleIcon className="h-5 w-5" />
                    )}
                    Issue certificate
                  </button>
                </>
              ) : (
                <button className="btn btn-primary w-full" onClick={approve} disabled={loading}>
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="h-5 w-5" />
                  )}
                  {role === "SIGNER" ? "Sign and approve" : "Approve"}
                </button>
              )}
              <textarea
                className="textarea textarea-bordered mt-4 w-full"
                placeholder="Rejection reason"
                value={reason}
                onChange={event => setReason(event.target.value)}
              />
              <button className="btn btn-error mt-3 w-full" onClick={reject} disabled={!reason || loading}>
                <XCircleIcon className="h-5 w-5" />
                Reject
              </button>
            </div>
          </aside>
        </div>
      )}

      <NdiModal
        isOpen={isNdiModalOpen}
        onClose={() => setIsNdiModalOpen(false)}
        onSuccess={() => setIsNdiModalOpen(false)}
      />
    </main>
  );
};

export default AgencyRequestActionPage;
