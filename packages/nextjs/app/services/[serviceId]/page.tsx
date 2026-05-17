"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  EnvelopeIcon,
  FingerPrintIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
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
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-4 inline-flex items-center rounded-full border border-secondary/15 bg-secondary/5 px-3 py-1 text-xs font-black uppercase tracking-widest text-secondary">
          {service?.agency.name || "Agency"}
        </div>
        <h1 className="text-3xl font-black text-base-content tracking-tight">{service?.name || "Agency Service"}</h1>
        <p className="mt-2 text-base-content/50 leading-relaxed">
          {service?.description || "Submit a request after Bhutan NDI login."}
        </p>
      </div>

      {submitted ? (
        <div className="rounded-3xl border border-base-200 bg-base-100 shadow-sm flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
            <CheckCircleIcon className="h-10 w-10 text-success" />
          </div>
          <h2 className="text-2xl font-black text-base-content">Request Submitted</h2>
          <p className="mt-3 text-base-content/50 max-w-xs leading-relaxed">
            The agency has been notified and will process your request shortly.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-base-200 bg-base-100 shadow-sm overflow-hidden">
          <div className="border-b border-base-200 px-8 py-5">
            <h2 className="text-sm font-black text-base-content uppercase tracking-widest">Submit Request</h2>
            <p className="text-xs text-base-content/40 mt-0.5">All fields are optional unless marked required</p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-error/10 bg-error/5 px-4 py-3 text-error mb-6">
                <span className="text-sm font-bold">{error}</span>
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-2 items-start">
              {/* Left — Email + Notes */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-base-content/40">
                    <EnvelopeIcon className="h-3.5 w-3.5" />
                    Email for Updates
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-base-300 bg-base-200/40 px-4 font-semibold text-base-content outline-none transition focus:border-secondary focus:bg-base-100 text-sm"
                    type="email"
                    placeholder="your@email.com"
                    value={citizenEmail}
                    onChange={e => setCitizenEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-base-content/40">
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                    Request Notes
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-base-300 bg-base-200/40 px-4 py-3 font-semibold text-base-content outline-none transition focus:border-secondary focus:bg-base-100 text-sm resize-none min-h-40 leading-relaxed"
                    placeholder="Describe your request…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Right — PDF Upload */}
              {service?.requirementMode === "DOCUMENT_REQUIRED" && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-base-content/40">
                    <DocumentArrowUpIcon className="h-3.5 w-3.5" />
                    PDF Document
                    <span className="text-error">*</span>
                  </label>
                  <div
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-base-300 bg-base-200/30 py-16 cursor-pointer hover:border-secondary/40 hover:bg-base-200/60 transition-all h-full min-h-[200px]"
                    onClick={() => window.document.getElementById("service-file-upload")?.click()}
                  >
                    <div className="h-12 w-12 rounded-xl bg-base-100 flex items-center justify-center text-base-content/30 shadow-sm">
                      <DocumentArrowUpIcon className="h-6 w-6" />
                    </div>
                    {file ? (
                      <p className="text-sm font-bold text-secondary">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-base-content/40">Click to select a PDF</p>
                        <p className="text-xs text-base-content/30">Maximum file size 10MB</p>
                      </>
                    )}
                    <input
                      id="service-file-upload"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={event => setFile(event.target.files?.[0] || null)}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t border-base-200 px-8 py-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="btn btn-ghost h-12 flex-1 gap-2 border border-base-300 text-sm font-bold"
              onClick={() => setIsNdiModalOpen(true)}
            >
              <FingerPrintIcon className="h-4 w-4" />
              Sign in with NDI
            </button>
            <button
              className="btn btn-secondary h-12 flex-1 gap-2 text-sm shadow-md shadow-secondary/20"
              onClick={submit}
              disabled={loading || (service?.requirementMode === "DOCUMENT_REQUIRED" && !file)}
            >
              {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PaperAirplaneIcon className="h-4 w-4" />}
              Submit Request
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
