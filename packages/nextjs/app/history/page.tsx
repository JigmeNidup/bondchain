"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ClockIcon,
  DocumentTextIcon,
  FingerPrintIcon,
  InboxArrowDownIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type ProofRequest = {
  proofRequestThreadId: string;
  proofRequestURL: string;
  deepLinkURL: string;
};

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

const formatDate = (value: string) => new Date(value).toLocaleString();
const shortHash = (value: string) => `${value.slice(0, 10)}...${value.slice(-8)}`;

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [proof, setProof] = useState<ProofRequest | null>(null);
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

  useEffect(() => {
    if (!proof || history) return;

    const timer = window.setInterval(async () => {
      try {
        const status = await bondchainFetch<{ status: string }>(`/auth/ndi/status/${proof.proofRequestThreadId}`);
        if (status.status === "VERIFIED") await loadHistory();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify NDI session");
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [proof, history]);

  const startLogin = async () => {
    setError("");
    setLoading(true);
    try {
      setProof(await bondchainFetch<ProofRequest>("/auth/ndi/initiate", { method: "POST" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start NDI login");
    } finally {
      setLoading(false);
    }
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
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="m-0 text-sm font-semibold uppercase text-primary">Private history</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">Track document signing activity</h1>
          </div>
          <ClockIcon className="h-8 w-8 text-primary" />
        </div>

        {!history && (
          <div className="mt-6 rounded-lg border border-base-300 p-4">
            {!proof && (
              <button className="btn btn-primary min-h-11 rounded-lg" onClick={startLogin} disabled={loading}>
                {loading && <span className="loading loading-spinner loading-sm" />}
                Login with NDI
              </button>
            )}
            {proof && (
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="flex aspect-square items-center justify-center rounded-lg border border-base-300 bg-white p-4">
                  <QRCodeSVG value={proof.proofRequestURL} size={180} />
                </div>
                <div className="flex flex-col justify-between gap-4">
                  <p className="m-0 rounded-lg bg-base-200 p-4 font-semibold">Waiting for NDI verification</p>
                  <a className="btn btn-outline min-h-11 rounded-lg" href={proof.deepLinkURL}>
                    Open NDI Wallet
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {history && (
          <>
            <div className="tabs tabs-box mt-6">
              {[
                ["all", "All"],
                ["uploaded", "Uploaded"],
                ["sent", "Sent"],
                ["received", "Received"],
                ["signed", "Signed"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`tab ${tab === value ? "tab-active" : ""}`}
                  onClick={() => setTab(value as HistoryTab)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {empty && (
              <div className="mt-6 rounded-lg border border-base-300 p-6 text-center">
                <p className="m-0 font-semibold">No signing history yet</p>
                <Link className="btn btn-primary mt-4 min-h-11 rounded-lg" href="/user-to-user">
                  Start a user signing request
                </Link>
              </div>
            )}

            <div className="mt-6 grid gap-4">
              {(tab === "all" || tab === "received") &&
                history.receivedRequests.map(request => (
                  <HistoryCard
                    key={`received-${request.token}`}
                    icon={<InboxArrowDownIcon className="h-5 w-5" />}
                    title={request.document?.fileName || "Received signing request"}
                    status={request.status}
                    date={request.updatedAt}
                    docHash={request.docHash}
                    actionHref={request.verificationLink || request.signingLink}
                    actionLabel={request.verificationLink ? "Verify" : "Sign"}
                  />
                ))}

              {(tab === "all" || tab === "sent") &&
                history.sentRequests.map(request => (
                  <HistoryCard
                    key={`sent-${request.token}`}
                    icon={<PaperAirplaneIcon className="h-5 w-5" />}
                    title={request.document?.fileName || "Sent signing request"}
                    status={request.status}
                    date={request.updatedAt}
                    docHash={request.docHash}
                    actionHref={request.verificationLink || request.signingLink}
                    actionLabel={request.verificationLink ? "Verify" : "Open request"}
                  />
                ))}

              {(tab === "all" || tab === "uploaded") &&
                history.documents.map(document => (
                  <HistoryCard
                    key={`document-${document.id}`}
                    icon={<DocumentTextIcon className="h-5 w-5" />}
                    title={document.fileName || "Uploaded document"}
                    status={`${document.signatureCount} signature${document.signatureCount === 1 ? "" : "s"}`}
                    date={document.createdAt}
                    docHash={document.docHash}
                    actionHref={document.ipfsGatewayUrl}
                    actionLabel="Preview"
                  />
                ))}

              {(tab === "all" || tab === "signed") &&
                history.signatures.map(signature => (
                  <HistoryCard
                    key={`signature-${signature.signatureHash}`}
                    icon={<FingerPrintIcon className="h-5 w-5" />}
                    title="Signature recorded"
                    status="SIGNED"
                    date={signature.createdAt}
                    docHash={signature.docHash}
                    actionHref={`/verify/${signature.signatureHash}`}
                    actionLabel="Verify"
                  />
                ))}
            </div>
          </>
        )}

        {error && <div className="alert alert-error mt-6 rounded-lg text-sm">{error}</div>}
      </section>
    </main>
  );
};

const HistoryCard = ({
  icon,
  title,
  status,
  date,
  docHash,
  actionHref,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  date: string;
  docHash: string;
  actionHref: string;
  actionLabel: string;
}) => (
  <div className="rounded-lg border border-base-300 p-4">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">{icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="m-0 font-semibold">{title}</p>
            <span className="badge badge-outline">{status}</span>
          </div>
          <p className="m-0 mt-1 text-sm text-base-content/65">{formatDate(date)}</p>
          <p className="m-0 mt-2 break-all font-mono text-xs">{shortHash(docHash)}</p>
        </div>
      </div>
      <Link className="btn btn-outline min-h-11 rounded-lg" href={actionHref}>
        {actionLabel}
      </Link>
    </div>
  </div>
);

export default HistoryPage;
