"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowPathIcon, CheckCircleIcon, FingerPrintIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

type Service = {
  id: string;
  name: string;
  description?: string | null;
  requirementMode: string;
  agency: { name: string };
};

const ServiceSubmitPage = () => {
  const params = useParams<{ serviceId: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [citizenEmail, setCitizenEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const service = useMemo(() => services.find(item => item.id === params.serviceId), [params.serviceId, services]);

  useEffect(() => {
    bondchainFetch<{ services: Service[] }>("/services")
      .then(response => setServices(response.services))
      .catch(err => setError(err instanceof Error ? err.message : "Unable to load service"));
  }, []);

  const submit = async () => {
    if (!service) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("metadataJson", JSON.stringify({ notes }));
      if (citizenEmail) form.append("citizenEmail", citizenEmail);
      if (file) form.append("file", file);
      await bondchainFetch(`/services/${service.id}/requests`, { method: "POST", body: form });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-base-300 pb-8">
        <div className="mb-4 inline-flex rounded-full border border-secondary/10 bg-secondary/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary">
          {service?.agency.name || "Agency"}
        </div>
        <h1 className="text-3xl font-black text-base-content">{service?.name || "Agency Service"}</h1>
        <p className="mt-3 text-base-content/60">
          {service?.description || "Submit a request after Bhutan NDI login."}
        </p>
      </div>

      {error && <div className="alert alert-error mb-6">{error}</div>}
      {submitted ? (
        <div className="card items-center bg-base-100 p-12 text-center shadow-sm">
          <CheckCircleIcon className="h-16 w-16 text-success" />
          <h2 className="mt-6 text-2xl font-black">Request submitted</h2>
          <p className="mt-3 text-base-content/60">The first agency officer has been notified.</p>
        </div>
      ) : (
        <div className="card bg-base-100 p-6 shadow-sm">
          <label className="form-control mb-4">
            <span className="label-text font-bold">Email for updates</span>
            <input
              className="input input-bordered"
              type="email"
              value={citizenEmail}
              onChange={e => setCitizenEmail(e.target.value)}
            />
          </label>
          <label className="form-control mb-4">
            <span className="label-text font-bold">Request notes</span>
            <textarea
              className="textarea textarea-bordered min-h-32"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </label>
          {service?.requirementMode === "DOCUMENT_REQUIRED" && (
            <label className="form-control mb-6">
              <span className="label-text font-bold">PDF document</span>
              <input
                className="file-input file-input-bordered"
                type="file"
                accept="application/pdf"
                onChange={event => setFile(event.target.files?.[0] || null)}
                required
              />
            </label>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="btn btn-secondary" onClick={() => setIsNdiModalOpen(true)}>
              <FingerPrintIcon className="h-5 w-5" />
              Sign in with NDI
            </button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={loading || (service?.requirementMode === "DOCUMENT_REQUIRED" && !file)}
            >
              {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PaperAirplaneIcon className="h-5 w-5" />}
              Submit request
            </button>
          </div>
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

export default ServiceSubmitPage;
