"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  InboxArrowDownIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

type HistoryDocument = {
  id: string;
  docHash: string;
  fileName?: string | null;
  ipfsGatewayUrl: string;
  signatureCount: number;
  createdAt: string;
};

type HistorySignature = {
  docHash: string;
  signatureHash: string;
  txHash: string;
  createdAt: string;
};

type HistoryRequest = {
  token: string;
  docHash: string;
  requesterEmail: string;
  targetEmail: string;
  status: string;
  signingLink: string;
  verificationLink?: string | null;
  createdAt: string;
  updatedAt: string;
  document?: {
    fileName?: string | null;
    ipfsGatewayUrl: string;
  } | null;
};

type HistoryResponse = {
  documents: HistoryDocument[];
  signatures: HistorySignature[];
  sentRequests: HistoryRequest[];
  receivedRequests: HistoryRequest[];
};

type HistoryTab = "all" | "uploaded" | "sent" | "received" | "signed";

const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const shortHash = (value: string) => `${value.slice(0, 12)}...${value.slice(-10)}`;

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [tab, setTab] = useState<HistoryTab>("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setError("");
    setLoading(true);
    try {
      setHistory(await bondchainFetch<HistoryResponse>("/history"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleNdiSuccess = () => {
    loadHistory();
  };

  const empty = useMemo(() => {
    if (!history) return true;
    return (
      history.documents.length === 0 &&
      history.signatures.length === 0 &&
      history.sentRequests.length === 0 &&
      history.receivedRequests.length === 0
    );
  }, [history]);

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-base-300 pb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary bg-primary/5 border border-primary/10 mb-6">
              Immutable Records
            </div>
            <h1 className="text-3xl font-black text-base-content leading-tight">Digital Archive</h1>
            <p className="mt-4 text-lg text-base-content/60 leading-relaxed">
              Explore your complete audit trail of civic actions, signatures, and document provenance.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              className="btn btn-primary h-11 px-6 shadow-lg shadow-primary/20 text-sm"
              onClick={() => setIsNdiModalOpen(true)}
              disabled={loading}
            >
              {loading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FingerPrintIcon className="h-4 w-4 mr-2" />
              )}
              Refresh Audit
            </button>
          </div>
        </div>

        {!history && (
          <div className="py-24 card bg-base-200/50 border-dashed border-2 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-3xl bg-base-100 shadow-sm flex items-center justify-center text-base-content/20 mb-8 border border-base-300">
              <ShieldCheckIcon className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-base-content">Encrypted Session Required</h3>
            <p className="text-base-content/60 mt-4 max-w-sm leading-relaxed">
              Your history is protected by Bhutan NDI sovereign keys. Please authenticate to decrypt your audit logs.
            </p>
            <button className="btn btn-primary mt-10 h-14 px-12 text-lg" onClick={() => setIsNdiModalOpen(true)}>
              Sign in with NDI
            </button>
          </div>
        )}

        {history && (
          <div className="animate-in fade-in duration-700">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-base-300/50 rounded-[1.25rem] w-fit mb-10">
              {[
                ["all", "All Activity", ClockIcon],
                ["uploaded", "Files", DocumentTextIcon],
                ["sent", "Outbound", PaperAirplaneIcon],
                ["received", "Inbound", InboxArrowDownIcon],
                ["signed", "Executed", FingerPrintIcon],
              ].map(([value, label, Icon]) => (
                <button
                  key={value as string}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    tab === value
                      ? "bg-base-100 text-primary shadow-sm scale-105"
                      : "text-base-content/40 hover:text-base-content hover:bg-base-300/50"
                  }`}
                  onClick={() => setTab(value as HistoryTab)}
                >
                  <Icon className="h-4 w-4" />
                  {label as string}
                </button>
              ))}
            </div>

            {empty ? (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-base-200/50 flex items-center justify-center text-base-content/20 mb-6 border border-base-300">
                  <DocumentTextIcon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-base-content">No Records Found</h3>
                <p className="text-base-content/60 mt-2">You haven&apos;t initiated any signing workflows yet.</p>
                <Link href="/user-to-user" className="btn btn-primary mt-8 h-14 px-8">
                  Create First Request
                </Link>
              </div>
            ) : (
              <div className="grid gap-6">
                {(tab === "all" || tab === "received") &&
                  history.receivedRequests.map(request => (
                    <HistoryCard
                      key={`received-${request.token}`}
                      icon={<InboxArrowDownIcon className="h-6 w-6" />}
                      type="Received Request"
                      title={request.document?.fileName || "Incoming Signature Request"}
                      status={request.status}
                      date={request.updatedAt}
                      docHash={request.docHash}
                      actionHref={request.verificationLink || request.signingLink}
                      actionLabel={request.verificationLink ? "View Proof" : "Apply Signature"}
                      color="secondary"
                    />
                  ))}

                {(tab === "all" || tab === "sent") &&
                  history.sentRequests.map(request => (
                    <HistoryCard
                      key={`sent-${request.token}`}
                      icon={<PaperAirplaneIcon className="h-6 w-6" />}
                      type="Sent Request"
                      title={request.document?.fileName || "Outbound Execution"}
                      status={request.status}
                      date={request.updatedAt}
                      docHash={request.docHash}
                      actionHref={request.verificationLink || request.signingLink}
                      actionLabel={request.verificationLink ? "View Proof" : "Manage"}
                      color="primary"
                    />
                  ))}

                {(tab === "all" || tab === "uploaded") &&
                  history.documents.map(document => (
                    <HistoryCard
                      key={`document-${document.id}`}
                      icon={<DocumentTextIcon className="h-6 w-6" />}
                      type="File Upload"
                      title={document.fileName || "Stored Document"}
                      status={`${document.signatureCount} signature${document.signatureCount === 1 ? "" : "s"}`}
                      date={document.createdAt}
                      docHash={document.docHash}
                      actionHref={document.ipfsGatewayUrl}
                      actionLabel="Preview PDF"
                      color="slate"
                    />
                  ))}

                {(tab === "all" || tab === "signed") &&
                  history.signatures.map(signature => (
                    <HistoryCard
                      key={`signature-${signature.signatureHash}`}
                      icon={<FingerPrintIcon className="h-6 w-6" />}
                      type="Signature Execution"
                      title="On-Chain Audit Record"
                      status="VERIFIED"
                      date={signature.createdAt}
                      docHash={signature.docHash}
                      actionHref={`/verify/${signature.signatureHash}`}
                      actionLabel="Provenance"
                      color="primary"
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl bg-error/5 border border-error/10 p-4 flex items-center gap-3 text-error font-bold">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </section>

      <NdiModal
        isOpen={isNdiModalOpen}
        onClose={() => setIsNdiModalOpen(false)}
        onSuccess={handleNdiSuccess}
        title="Refresh Archive"
      />
    </main>
  );
};

const HistoryCard = ({
  icon,
  type,
  title,
  status,
  date,
  docHash,
  actionHref,
  actionLabel,
  color,
}: {
  icon: React.ReactNode;
  type: string;
  title: string;
  status: string;
  date: string;
  docHash: string;
  actionHref: string;
  actionLabel: string;
  color: "primary" | "secondary" | "slate";
}) => (
  <div className="group card p-6 md:p-8 hover:bg-base-200/50 transition-all border-base-300">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
      <div className="flex flex-1 min-w-0 gap-6">
        <div
          className={`h-13 w-13 shrink-0 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${
            color === "primary"
              ? "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-content"
              : color === "secondary"
                ? "bg-secondary/5 text-secondary group-hover:bg-secondary group-hover:text-secondary-content"
                : "bg-base-300/50 text-base-content/40 group-hover:bg-base-content group-hover:text-base-100"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40">{type}</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                status === "VERIFIED" || status === "SIGNED" || status.includes("signature")
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-base-300/50 text-base-content/40 border border-base-300"
              }`}
            >
              {status}
            </span>
          </div>
          <h3 className="text-xl font-black text-base-content mb-2 truncate">{title}</h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-base-content/40">
              <ClockIcon className="h-4 w-4" />
              {formatDate(date)}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-base-content/20 group-hover:text-base-content/40 transition-colors">
              <ShieldCheckIcon className="h-4 w-4" />
              {shortHash(docHash)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href={actionHref}
          className={`btn h-11 px-6 text-xs font-bold rounded-xl shadow-lg transition-all ${
            color === "primary"
              ? "btn-primary shadow-primary/20"
              : color === "secondary"
                ? "btn-secondary shadow-secondary/20"
                : "btn-outline border-2"
          }`}
        >
          {actionLabel}
          <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1.5" />
        </Link>
      </div>
    </div>
  </div>
);

export default HistoryPage;
