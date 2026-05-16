"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

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
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
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

  const handleNdiSuccess = (did: string) => {
    setSession({ status: "VERIFIED", didKey: did });
  };

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

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

  const sendRequest = async (event: React.FormEvent) => {
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
    <main className="mx-auto grid min-h-[calc(100dvh-80px)] w-full max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[400px_1fr] lg:px-8">
      {/* Sidebar Guidance */}
      <section className="flex flex-col gap-10">
        <div>
          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary bg-secondary/5 border border-secondary/10 mb-6">
            Institutional Signing
          </div>
          <h1 className="text-3xl font-black text-base-content leading-tight">
            Peer-to-Peer <br />
            Execution
          </h1>
          <p className="mt-4 text-base-content/60 leading-relaxed">
            Invite another Bhutan NDI identity to sign a document. All actions are identity-gated and auditable.
          </p>
        </div>

        <div className="flex flex-col gap-6 relative">
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-base-300 -z-10" />
          {[
            { step: 1, title: "Identity", done: session?.status === "VERIFIED", icon: FingerPrintIcon },
            { step: 2, title: "Document", done: !!document, icon: DocumentIcon },
            { step: 3, title: "Origin", done: !!signature, icon: CheckCircleIcon },
            { step: 4, title: "Dispatch", done: !!peerRequest, icon: PaperAirplaneIcon },
          ].map(item => (
            <div
              key={item.step}
              className={`flex gap-6 items-start transition-all duration-500 ${item.done ? "opacity-100" : "opacity-40"}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  item.done
                    ? "bg-secondary border-secondary text-secondary-content"
                    : "bg-base-100 border-base-300 text-base-content/40"
                }`}
              >
                {item.done ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  <span className="text-xs font-bold">{item.step}</span>
                )}
              </span>
              <div>
                <h3 className={`text-base font-bold m-0 ${item.done ? "text-base-content" : "text-base-content/40"}`}>
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Action Center */}
      <section className="card p-2 shadow-xl bg-base-200/50">
        <div className="card h-full flex flex-col p-8 md:p-12 overflow-hidden bg-base-100 border-none">
          <div className="flex items-center justify-between border-b border-base-300 pb-8 mb-8">
            <h2 className="text-xl font-black text-base-content">Workflow Execution</h2>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${session?.status === "VERIFIED" ? "bg-secondary animate-pulse" : "bg-base-300"}`}
              />
              <span className="text-xs font-bold uppercase tracking-widest text-base-content/40">
                {session?.status === "VERIFIED" ? "Identity Active" : "Authentication Required"}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {session?.status !== "VERIFIED" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                <div className="h-20 w-20 rounded-3xl bg-secondary/5 flex items-center justify-center text-secondary mb-8 shadow-inner border border-secondary/10">
                  <FingerPrintIcon className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-base-content">Author Authentication</h3>
                <p className="text-base-content/60 mt-4 max-w-sm leading-relaxed">
                  You must be verified to initiate civic signing requests.
                </p>
                <button
                  className="btn btn-secondary mt-10 h-14 w-full max-w-sm text-lg shadow-lg"
                  onClick={() => setIsNdiModalOpen(true)}
                  disabled={loading}
                >
                  Sign in with NDI
                </button>
              </div>
            )}

            {session?.status === "VERIFIED" && !document && (
              <div className="flex-1 flex flex-col animate-in fade-in duration-700">
                <h2 className="text-2xl font-black text-base-content mb-8">1. Upload Document</h2>
                <div
                  className="flex-1 border-2 border-dashed border-base-300 rounded-[2.5rem] bg-base-200/50 flex flex-col items-center justify-center p-12 hover:border-secondary/40 hover:bg-base-300/30 transition-all cursor-pointer group"
                  onClick={() => window.document.getElementById("file-upload")?.click()}
                >
                  <div className="h-16 w-16 rounded-3xl bg-base-100 text-base-content/20 flex items-center justify-center mb-6 shadow-sm group-hover:text-secondary transition-colors">
                    <DocumentArrowUpIcon className="h-8 w-8" />
                  </div>
                  <p className="text-lg font-bold text-base-content m-0">Select PDF Notesheet</p>
                  <p className="text-sm text-base-content/40 mt-2">Maximum file size 10MB</p>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={uploadDocument}
                  />
                </div>
              </div>
            )}

            {document && !signature && (
              <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-2xl font-black text-base-content mb-6">2. Apply Origin Signature</h2>

                <div className="card p-6 border-base-300 bg-base-200/50 mb-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-2">
                    Content Hash
                  </p>
                  <p className="font-mono text-sm text-secondary font-bold m-0 break-all">{document.docHash}</p>
                </div>

                <div className="flex-1 relative rounded-2xl overflow-hidden border border-base-300 shadow-inner bg-slate-900">
                  <iframe className="w-full h-full" src={document.ipfsGatewayUrl} />
                </div>

                <button
                  className="btn btn-secondary mt-8 h-14 text-lg shadow-xl shadow-secondary/20"
                  onClick={signOriginDocument}
                  disabled={loading}
                >
                  {loading ? (
                    <ArrowPathIcon className="h-6 w-6 animate-spin mr-2" />
                  ) : (
                    <FingerPrintIcon className="h-6 w-6 mr-2" />
                  )}
                  Sign Document as Origin
                </button>
              </div>
            )}

            {signature && !peerRequest && (
              <form
                className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700"
                onSubmit={sendRequest}
              >
                <h2 className="text-2xl font-black text-base-content mb-2">3. Define Recipient</h2>
                <p className="text-base-content/40 mb-8 leading-relaxed">
                  The document will be identity-locked to these specific credentials.
                </p>

                <div className="grid gap-6">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-base-content/40 px-1">
                      Your Identity (Requester)
                    </label>
                    <input
                      className="w-full h-14 px-6 rounded-2xl bg-base-200/50 border-2 border-base-300 focus:border-secondary focus:bg-base-100 outline-none transition-all font-bold text-base-content"
                      type="email"
                      value={requesterEmail}
                      onChange={e => setRequesterEmail(e.target.value)}
                      placeholder="Your official email"
                      required
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-base-content/40 px-1">
                        Target CID
                      </label>
                      <input
                        className="w-full h-14 px-6 rounded-2xl bg-base-200/50 border-2 border-base-300 focus:border-secondary focus:bg-base-100 outline-none transition-all font-bold text-base-content"
                        value={targetCid}
                        onChange={e => setTargetCid(e.target.value)}
                        placeholder="Recipient's CID"
                        required
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-base-content/40 px-1">
                        Target Email
                      </label>
                      <input
                        className="w-full h-14 px-6 rounded-2xl bg-base-200/50 border-2 border-base-300 focus:border-secondary focus:bg-base-100 outline-none transition-all font-bold text-base-content"
                        type="email"
                        value={targetEmail}
                        onChange={e => setTargetEmail(e.target.value)}
                        placeholder="Recipient's NDI email"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-12">
                  <button
                    className="btn btn-secondary w-full h-14 text-lg shadow-xl shadow-secondary/20"
                    disabled={loading}
                  >
                    {loading ? (
                      <ArrowPathIcon className="h-6 w-6 animate-spin mr-2" />
                    ) : (
                      <PaperAirplaneIcon className="h-6 w-6 mr-2" />
                    )}
                    Dispatch Peer Request
                  </button>
                </div>
              </form>
            )}

            {peerRequest && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                <div className="h-20 w-20 rounded-full bg-secondary/5 flex items-center justify-center text-secondary mb-8 shadow-inner border border-secondary/10">
                  <CheckCircleIcon className="h-10 w-10" />
                </div>
                <h3 className="text-3xl font-black text-base-content">Request Dispatched</h3>
                <p className="text-base-content/60 mt-4 max-w-sm leading-relaxed mb-10">
                  The document has been securely routed. The recipient can now verify and sign using the link below.
                </p>
                <div className="card p-8 bg-base-200/50 border-base-300 w-full mb-10 text-left">
                  <p className="text-xs font-black uppercase tracking-widest text-base-content/40 mb-3">
                    Signing Token
                  </p>
                  <p className="font-mono text-sm text-secondary font-bold m-0 break-all">{peerRequest.token}</p>
                </div>
                <Link href="/history" className="btn btn-secondary h-14 w-full text-lg shadow-xl shadow-secondary/20">
                  Monitor Fulfillment
                </Link>
              </div>
            )}

            {error && (
              <div className="mt-8 rounded-2xl bg-error/5 border border-error/10 p-4 flex items-center gap-3 text-error font-bold animate-in shake duration-500">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <NdiModal isOpen={isNdiModalOpen} onClose={() => setIsNdiModalOpen(false)} onSuccess={handleNdiSuccess} />
    </main>
  );
};

export default UserToUserPage;
