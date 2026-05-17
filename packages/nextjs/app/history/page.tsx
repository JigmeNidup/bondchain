"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
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

type HistoryAgencyRequest = {
  token: string;
  docHash?: string | null;
  status: string;
  updatedAt: string;
  verificationLink?: string | null;
  service: {
    name: string;
    agency: { name: string };
  };
  document?: {
    fileName?: string | null;
    ipfsGatewayUrl: string;
  } | null;
  certificate?: {
    fileName?: string | null;
    ipfsGatewayUrl: string;
  } | null;
};

type HistoryResponse = {
  documents: HistoryDocument[];
  signatures: HistorySignature[];
  sentRequests: HistoryRequest[];
  receivedRequests: HistoryRequest[];
  agencyRequests: HistoryAgencyRequest[];
};

type HistoryTab = "all" | "uploaded" | "sent" | "received" | "signed" | "agency";

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

const shortHash = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;

const STATUS_STYLE: Record<string, string> = {
  VERIFIED: "text-success",
  SIGNED: "text-success",
  PENDING: "text-warning",
  REJECTED: "text-error",
};

const TABS: [HistoryTab, string, React.ElementType][] = [
  ["all", "All", ClockIcon],
  ["uploaded", "Files", DocumentTextIcon],
  ["sent", "Sent", PaperAirplaneIcon],
  ["received", "Received", InboxArrowDownIcon],
  ["agency", "Agency", ShieldCheckIcon],
  ["signed", "Signed", FingerPrintIcon],
];

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

  const empty = useMemo(() => {
    if (!history) return true;
    return (
      history.documents.length === 0 &&
      history.signatures.length === 0 &&
      history.sentRequests.length === 0 &&
      history.receivedRequests.length === 0 &&
      history.agencyRequests.length === 0
    );
  }, [history]);

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-6 border-b border-base-200 pb-8">
        <div>
          <h1 className="text-2xl font-black text-base-content">Digital Archive</h1>
          <p className="mt-1 text-sm text-base-content/40">
            Your complete audit trail of documents, signatures, and requests.
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm h-9 gap-2 border border-base-200 text-xs font-bold"
          onClick={() => setIsNdiModalOpen(true)}
          disabled={loading}
        >
          <FingerPrintIcon className="h-4 w-4" />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Not authenticated */}
      {!history && !loading && !error && (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <ShieldCheckIcon className="h-10 w-10 text-base-content/20" />
          <p className="text-sm font-bold text-base-content/40">Authenticate to view your archive</p>
          <button className="btn btn-primary btn-sm mt-2 h-9 px-6 text-xs" onClick={() => setIsNdiModalOpen(true)}>
            Sign in with NDI
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-base-200" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-error/10 bg-error/5 p-4 text-error">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {history && !loading && (
        <div>
          {/* Tabs */}
          <div className="mb-6 flex gap-1 border-b border-base-200">
            {TABS.map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`flex items-center gap-1.5 px-3 pb-3 pt-1 text-xs font-bold transition-colors ${
                  tab === value
                    ? "border-b-2 border-primary text-primary"
                    : "text-base-content/40 hover:text-base-content"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {empty ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <DocumentTextIcon className="h-8 w-8 text-base-content/20" />
              <p className="text-sm font-bold text-base-content/40">No records yet.</p>
              <Link href="/user-to-user" className="btn btn-primary btn-sm h-9 px-6 text-xs mt-2">
                Create First Request
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-300 bg-base-200">
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-base-content/40">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-base-content/40">
                      Document
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-base-content/40">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-base-content/40 hidden sm:table-cell">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-base-content/40 hidden md:table-cell">
                      Hash
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(tab === "all" || tab === "agency") &&
                    history.agencyRequests.map(r => (
                      <TableRow
                        key={`agency-${r.token}`}
                        icon={<ShieldCheckIcon className="h-3.5 w-3.5" />}
                        type={r.service.agency.name}
                        title={r.service.name}
                        status={r.status}
                        date={r.updatedAt}
                        docHash={r.docHash || "0x0000000000000000000000000000000000000000000000000000000000000000"}
                        href={r.verificationLink || r.certificate?.ipfsGatewayUrl || "/services"}
                        actionLabel={r.verificationLink ? "View Proof" : r.certificate ? "Certificate" : "Track"}
                      />
                    ))}

                  {(tab === "all" || tab === "received") &&
                    history.receivedRequests.map(r => (
                      <TableRow
                        key={`received-${r.token}`}
                        icon={<InboxArrowDownIcon className="h-3.5 w-3.5" />}
                        type="Received"
                        title={r.document?.fileName || "Incoming Signature Request"}
                        status={r.status}
                        date={r.updatedAt}
                        docHash={r.docHash}
                        href={r.verificationLink || r.signingLink}
                        actionLabel={r.verificationLink ? "View Proof" : "Sign"}
                      />
                    ))}

                  {(tab === "all" || tab === "sent") &&
                    history.sentRequests.map(r => (
                      <TableRow
                        key={`sent-${r.token}`}
                        icon={<PaperAirplaneIcon className="h-3.5 w-3.5" />}
                        type="Sent"
                        title={r.document?.fileName || "Outbound Request"}
                        status={r.status}
                        date={r.updatedAt}
                        docHash={r.docHash}
                        href={r.verificationLink || r.signingLink}
                        actionLabel={r.verificationLink ? "View Proof" : "Manage"}
                      />
                    ))}

                  {(tab === "all" || tab === "uploaded") &&
                    history.documents.map(d => (
                      <TableRow
                        key={`document-${d.id}`}
                        icon={<DocumentTextIcon className="h-3.5 w-3.5" />}
                        type="File"
                        title={d.fileName || "Stored Document"}
                        status={`${d.signatureCount} sig${d.signatureCount === 1 ? "" : "s"}`}
                        date={d.createdAt}
                        docHash={d.docHash}
                        href={d.ipfsGatewayUrl}
                        actionLabel="Preview"
                      />
                    ))}

                  {(tab === "all" || tab === "signed") &&
                    history.signatures.map(s => (
                      <TableRow
                        key={`signature-${s.signatureHash}`}
                        icon={<FingerPrintIcon className="h-3.5 w-3.5" />}
                        type="Signature"
                        title="On-Chain Record"
                        status="VERIFIED"
                        date={s.createdAt}
                        docHash={s.docHash}
                        href={`/verify/${s.signatureHash}`}
                        actionLabel="Verify"
                      />
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <NdiModal
        isOpen={isNdiModalOpen}
        onClose={() => setIsNdiModalOpen(false)}
        onSuccess={loadHistory}
        title="Refresh Archive"
      />
    </main>
  );
};

const TableRow = ({
  icon,
  type,
  title,
  status,
  date,
  docHash,
  href,
  actionLabel,
}: {
  icon: React.ReactNode;
  type: string;
  title: string;
  status: string;
  date: string;
  docHash: string;
  href: string;
  actionLabel: string;
}) => (
  <tr className="border-b border-base-300 hover:bg-base-200 transition-colors">
    <td className="px-4 py-3">
      <span className="flex items-center gap-1.5 text-xs font-bold text-base-content/40">
        <span className="text-base-content/30">{icon}</span>
        {type}
      </span>
    </td>
    <td className="px-4 py-3 max-w-[200px]">
      <p className="truncate text-sm font-semibold text-base-content">{title}</p>
    </td>
    <td className="px-4 py-3">
      <span className={`text-xs font-bold uppercase ${STATUS_STYLE[status.toUpperCase()] ?? "text-base-content/40"}`}>
        {status}
      </span>
    </td>
    <td className="hidden px-4 py-3 sm:table-cell">
      <span className="text-xs text-base-content/40">{formatDate(date)}</span>
    </td>
    <td className="hidden px-4 py-3 md:table-cell">
      <span className="font-mono text-[11px] text-base-content/30">{shortHash(docHash)}</span>
    </td>
    <td className="px-4 py-3 text-right">
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
        {actionLabel}
        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
      </Link>
    </td>
  </tr>
);

export default HistoryPage;
