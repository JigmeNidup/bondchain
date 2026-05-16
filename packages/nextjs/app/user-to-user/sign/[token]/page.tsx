"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowPathIcon, CheckCircleIcon, DocumentTextIcon, FingerPrintIcon } from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type ProofRequest = {
  proofRequestThreadId: string;
  proofRequestURL: string;
  deepLinkURL: string;
};

type SigningRequest = {
  token: string;
  docHash: string;
  requesterEmail: string;
  targetEmail: string;
  requesterSignatureHash: string;
  targetSignatureHash?: string | null;
  status: string;
  verificationLink?: string | null;
  document?: {
    fileName?: string | null;
    ipfsGatewayUrl: string;
  } | null;
};

const TargetSignPage = () => {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [request, setRequest] = useState<SigningRequest | null>(null);
  const [proof, setProof] = useState<ProofRequest | null>(null);
  const [ndiVerified, setNdiVerified] = useState(false);
  const [verificationLink, setVerificationLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    bondchainFetch<{ request: SigningRequest }>(`/peer-requests/${token}`)
      .then(response => {
        setRequest(response.request);
        if (response.request.verificationLink) setVerificationLink(response.request.verificationLink);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Unable to load signing request"));
  }, [token]);

  useEffect(() => {
    if (!proof || ndiVerified) return;

    const timer = window.setInterval(async () => {
      try {
        const status = await bondchainFetch<{ status: string }>(`/auth/ndi/status/${proof.proofRequestThreadId}`);
        if (status.status === "VERIFIED") setNdiVerified(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify NDI session");
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [proof, ndiVerified]);

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

  const sign = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await bondchainFetch<{ request: SigningRequest; verificationLink: string }>(
        `/peer-requests/${token}/sign`,
        { method: "POST" },
      );
      setRequest(response.request);
      setVerificationLink(response.verificationLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <DocumentTextIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold uppercase text-primary">Signature request</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              {request?.document?.fileName || "PDF document"}
            </h1>
          </div>
        </div>

        {request && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-lg bg-base-200 p-4">
              <p className="m-0 text-sm text-base-content/65">Document hash</p>
              <p className="m-0 mt-2 break-all font-mono text-sm">{request.docHash}</p>
            </div>
            {request.document?.ipfsGatewayUrl && (
              <iframe
                className="h-[520px] w-full rounded-lg border border-base-300"
                src={request.document.ipfsGatewayUrl}
                title="PDF preview"
              />
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="m-0 text-xl font-semibold">NDI authorization</h2>
          <FingerPrintIcon className="h-6 w-6 text-primary" />
        </div>

        <div className="mt-6 grid gap-4">
          {request && (
            <div className="rounded-lg border border-base-300 p-4">
              <p className="m-0 text-sm text-base-content/65">Requested by</p>
              <p className="m-0 mt-1 font-semibold">{request.requesterEmail}</p>
              <p className="m-0 mt-3 text-sm text-base-content/65">Status</p>
              <p className="m-0 mt-1 font-semibold">{verificationLink ? "SIGNED" : request.status}</p>
            </div>
          )}

          {!verificationLink && !ndiVerified && !proof && (
            <button className="btn btn-primary min-h-11 rounded-lg" onClick={startLogin} disabled={loading || !request}>
              {loading && <span className="loading loading-spinner loading-sm" />}
              Login with NDI
            </button>
          )}

          {!verificationLink && !ndiVerified && proof && (
            <div className="grid gap-4">
              <div className="flex aspect-square max-w-64 items-center justify-center rounded-lg border border-base-300 bg-white p-4">
                <QRCodeSVG value={proof.proofRequestURL} size={180} />
              </div>
              <a className="btn btn-outline min-h-11 rounded-lg" href={proof.deepLinkURL}>
                Open NDI Wallet
              </a>
            </div>
          )}

          {!verificationLink && ndiVerified && (
            <button className="btn btn-primary min-h-11 rounded-lg" onClick={sign} disabled={loading}>
              {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <FingerPrintIcon className="h-4 w-4" />}
              Sign document
            </button>
          )}

          {verificationLink && (
            <div className="rounded-lg border border-success/40 bg-success/10 p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-success" />
                <p className="m-0 font-semibold">Document signed</p>
              </div>
              <Link className="link mt-3 block break-all text-sm" href={verificationLink}>
                {verificationLink}
              </Link>
            </div>
          )}

          {error && <div className="alert alert-error rounded-lg text-sm">{error}</div>}
        </div>
      </section>
    </main>
  );
};

export default TargetSignPage;
