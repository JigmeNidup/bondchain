"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  FingerPrintIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type ProofRequest = {
  proofRequestThreadId: string;
  proofRequestURL: string;
  deepLinkURL: string;
};

type SessionStatus = {
  status?: "PENDING" | "VERIFIED" | "FAILED";
  valid?: boolean;
  didKey?: string;
};

type UploadedDocument = {
  docHash: string;
  ipfsCid: string;
  ipfsGatewayUrl: string;
  fileName?: string | null;
};

type SignatureResult = {
  signature: {
    signatureHash: string;
    txHash: string;
  };
  verificationLink: string;
};

type PeerRequest = {
  token: string;
  signingLink: string;
  status: string;
};

const UserToUserPage = () => {
  const [proof, setProof] = useState<ProofRequest | null>(null);
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [signature, setSignature] = useState<SignatureResult | null>(null);
  const [peerRequest, setPeerRequest] = useState<PeerRequest | null>(null);
  const [targetCid, setTargetCid] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bondchainFetch<SessionStatus>("/auth/session/verify", { method: "POST" })
      .then(result => {
        if (result.valid) setSession({ ...result, status: "VERIFIED" });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!proof || session?.status === "VERIFIED") return;

    const timer = window.setInterval(async () => {
      try {
        const nextStatus = await bondchainFetch<SessionStatus>(`/auth/ndi/status/${proof.proofRequestThreadId}`);
        setSession(nextStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to read NDI status");
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [proof, session?.status]);

  const startLogin = async () => {
    setError("");
    setLoading(true);
    try {
      setProof(await bondchainFetch<ProofRequest>("/auth/ndi/initiate", { method: "POST" }));
      setSession({ status: "PENDING" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start NDI login");
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setLoading(true);
    try {
      const response = await bondchainFetch<{ document: UploadedDocument }>("/documents/upload", {
        method: "POST",
        body: form,
      });
      setDocument(response.document);
      setSignature(null);
      setPeerRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload PDF");
    } finally {
      setLoading(false);
    }
  };

  const signOriginDocument = async () => {
    if (!document) return;
    setError("");
    setLoading(true);
    try {
      setSignature(
        await bondchainFetch<SignatureResult>("/sign/document", {
          method: "POST",
          json: { documentHash: document.docHash },
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign document");
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!document || !signature) return;
    setError("");
    setLoading(true);
    try {
      const response = await bondchainFetch<{ request: PeerRequest }>("/peer-requests", {
        method: "POST",
        json: {
          docHash: document.docHash,
          requesterSignatureHash: signature.signature.signatureHash,
          targetCid,
          targetEmail,
          requesterEmail,
        },
      });
      setPeerRequest(response.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send signing request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <p className="m-0 text-sm font-semibold uppercase text-primary">User signing</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">Send a PDF to another NDI user for signing</h1>

        <div className="mt-6 grid gap-3">
          {[
            ["NDI login", session?.status === "VERIFIED"],
            ["Upload PDF", !!document],
            ["Sign first", !!signature],
            ["Send request", !!peerRequest],
          ].map(([label, done], index) => (
            <div key={String(label)} className="flex items-center gap-3 rounded-lg border border-base-300 p-4">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  done ? "bg-success text-success-content" : "bg-secondary"
                }`}
              >
                {done ? <CheckCircleIcon className="h-4 w-4" /> : index + 1}
              </span>
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>

        {peerRequest && (
          <div className="mt-6 rounded-lg border border-success/40 bg-success/10 p-4">
            <p className="m-0 font-semibold">Signing request sent</p>
            <Link className="link mt-2 block break-all text-sm" href={peerRequest.signingLink}>
              {peerRequest.signingLink}
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="m-0 text-xl font-semibold">Create request</h2>
          <FingerPrintIcon className="h-6 w-6 text-primary" />
        </div>

        <div className="mt-6 grid gap-5">
          {session?.status !== "VERIFIED" && (
            <div className="rounded-lg border border-base-300 p-4">
              {!proof && (
                <button className="btn btn-primary min-h-11 rounded-lg" onClick={startLogin} disabled={loading}>
                  {loading && <span className="loading loading-spinner loading-sm" />}
                  Start NDI login
                </button>
              )}

              {proof && (
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                  <div className="flex aspect-square items-center justify-center rounded-lg border border-base-300 bg-white p-4">
                    <QRCodeSVG value={proof.proofRequestURL} size={180} />
                  </div>
                  <div className="flex flex-col justify-between gap-4">
                    <div className="rounded-lg bg-base-200 p-4">
                      <p className="m-0 text-sm font-medium">NDI status</p>
                      <p className="m-0 mt-1 text-lg font-semibold">{session?.status || "PENDING"}</p>
                    </div>
                    <a className="btn btn-outline min-h-11 rounded-lg" href={proof.deepLinkURL}>
                      Open NDI Wallet
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {session?.status === "VERIFIED" && (
            <form className="rounded-lg border border-base-300 p-4" onSubmit={uploadDocument}>
              <label className="form-control">
                <span className="label-text font-medium">PDF document</span>
                <input
                  className="file-input file-input-bordered mt-2 w-full"
                  type="file"
                  name="file"
                  accept="application/pdf"
                  required
                />
              </label>
              <button className="btn btn-primary mt-4 min-h-11 rounded-lg" disabled={loading}>
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <DocumentArrowUpIcon className="h-4 w-4" />
                )}
                Upload PDF
              </button>
            </form>
          )}

          {document && (
            <div className="rounded-lg border border-base-300 p-4">
              <p className="m-0 text-sm text-base-content/65">Document hash</p>
              <p className="m-0 mt-2 break-all font-mono text-sm">{document.docHash}</p>
              <iframe
                className="mt-4 h-80 w-full rounded-lg border border-base-300"
                src={document.ipfsGatewayUrl}
                title="PDF preview"
              />
              {!signature && (
                <button
                  className="btn btn-primary mt-4 min-h-11 rounded-lg"
                  onClick={signOriginDocument}
                  disabled={loading}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <PencilSquareIcon className="h-4 w-4" />
                  )}
                  Sign as origin user
                </button>
              )}
            </div>
          )}

          {signature && !peerRequest && (
            <form className="grid gap-4 rounded-lg border border-base-300 p-4" onSubmit={sendRequest}>
              <div className="rounded-lg bg-success/10 p-3">
                <p className="m-0 text-sm font-semibold">Origin signature recorded</p>
                <Link className="link mt-1 block break-all text-sm" href={signature.verificationLink}>
                  {signature.verificationLink}
                </Link>
              </div>
              <label className="form-control">
                <span className="label-text font-medium">Your email</span>
                <input
                  className="input input-bordered mt-2"
                  type="email"
                  value={requesterEmail}
                  onChange={event => setRequesterEmail(event.target.value)}
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text font-medium">Target signer CID</span>
                <input
                  className="input input-bordered mt-2"
                  value={targetCid}
                  onChange={event => setTargetCid(event.target.value)}
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text font-medium">Target signer email</span>
                <input
                  className="input input-bordered mt-2"
                  type="email"
                  value={targetEmail}
                  onChange={event => setTargetEmail(event.target.value)}
                  required
                />
              </label>
              <button className="btn btn-primary min-h-11 rounded-lg" disabled={loading}>
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4" />
                )}
                Submit signing request
              </button>
            </form>
          )}

          {error && <div className="alert alert-error rounded-lg text-sm">{error}</div>}
        </div>
      </section>
    </main>
  );
};

export default UserToUserPage;
