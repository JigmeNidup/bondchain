"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

type Member = { id: string; email: string; role: string; didKey: string };
type Service = {
  id: string;
  name: string;
  description?: string | null;
  requirementMode: string;
  workflowSteps: { id: string; stepNumber: number; role: string; member: Member }[];
};
type Agency = { id: string; name: string; members: Member[]; services: Service[] };

const AgencyPage = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [agencyId, setAgencyId] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerCid, setOfficerCid] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [requirementMode, setRequirementMode] = useState("DOCUMENT_REQUIRED");
  const [serviceId, setServiceId] = useState("");
  const [workflowRows, setWorkflowRows] = useState([{ stepNumber: 1, role: "VERIFIER", memberId: "" }]);
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "service"; id: string; label: string } | { type: "member"; id: string; label: string } | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedAgency = useMemo(
    () => agencies.find(agency => agency.id === agencyId) || agencies[0],
    [agencies, agencyId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await bondchainFetch<{ agencies: Agency[] }>("/agency/me");
      setAgencies(response.agencies);
      setAgencyId(currentAgencyId => currentAgencyId || response.agencies[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "NDI login required");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inviteOfficer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAgency) return;
    await bondchainFetch("/agency/officers", {
      method: "POST",
      json: { agencyId: selectedAgency.id, email: officerEmail, cid: officerCid },
    });
    setOfficerEmail("");
    setOfficerCid("");
    await load();
  };

  const createService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAgency) return;
    const response = await bondchainFetch<{ service: Service }>("/agency/services", {
      method: "POST",
      json: { agencyId: selectedAgency.id, name: serviceName, description, requirementMode },
    });
    setServiceId(response.service.id);
    setServiceName("");
    setDescription("");
    await load();
  };

  const saveWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceId) return;
    await bondchainFetch(`/agency/services/${serviceId}/workflow`, {
      method: "POST",
      json: { steps: workflowRows.filter(row => row.memberId) },
    });
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    setError("");
    try {
      const path =
        deleteTarget.type === "service" ? `/agency/services/${deleteTarget.id}` : `/agency/members/${deleteTarget.id}`;
      await bondchainFetch(path, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-6 border-b border-base-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-secondary/10 bg-secondary/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary">
            Agency Console
          </div>
          <h1 className="text-3xl font-black text-base-content">Services and Officers</h1>
          <p className="mt-3 max-w-2xl text-base-content/60">
            Configure citizen-facing services, invite officers, and define ordered workflows.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setIsNdiModalOpen(true)}>
          <FingerPrintIcon className="h-5 w-5" />
          NDI Login
        </button>
      </div>

      {error && <div className="alert alert-warning mb-6">{error}</div>}
      {loading && <div className="loading loading-spinner" />}

      {selectedAgency ? (
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-6">
            <select
              className="select select-bordered w-full"
              value={selectedAgency.id}
              onChange={e => setAgencyId(e.target.value)}
            >
              {agencies.map(agency => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>

            <form className="card bg-base-100 p-6 shadow-sm" onSubmit={inviteOfficer}>
              <h2 className="mb-4 text-lg font-black">Invite Officer</h2>
              <input
                className="input input-bordered mb-3 w-full"
                type="email"
                placeholder="Officer email"
                value={officerEmail}
                onChange={e => setOfficerEmail(e.target.value)}
                required
              />
              <input
                className="input input-bordered mb-4 w-full"
                placeholder="Officer CID"
                value={officerCid}
                onChange={e => setOfficerCid(e.target.value)}
                required
              />
              <button className="btn btn-secondary">
                <PaperAirplaneIcon className="h-5 w-5" />
                Send invite
              </button>
            </form>

            <div className="card bg-base-100 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-black">Registered Members</h2>
              <div className="space-y-2">
                {selectedAgency.members.map(member => (
                  <div key={member.id} className="rounded-xl bg-base-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{member.email}</p>
                        <p className="text-xs uppercase tracking-widest text-base-content/50">{member.role}</p>
                      </div>
                      {member.role !== "ADMIN" && (
                        <button
                          className="btn btn-error btn-xs"
                          type="button"
                          onClick={() => setDeleteTarget({ type: "member", id: member.id, label: member.email })}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <form className="card bg-base-100 p-6 shadow-sm" onSubmit={createService}>
              <h2 className="mb-4 text-xl font-black">Create Service</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="input input-bordered"
                  placeholder="Service name"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  required
                />
                <select
                  className="select select-bordered"
                  value={requirementMode}
                  onChange={e => setRequirementMode(e.target.value)}
                >
                  <option value="DOCUMENT_REQUIRED">Document required</option>
                  <option value="NDI_ONLY">NDI only</option>
                </select>
              </div>
              <textarea
                className="textarea textarea-bordered mt-4"
                placeholder="Service description"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <button className="btn btn-secondary mt-4 w-fit">
                <PlusIcon className="h-5 w-5" />
                Create service
              </button>
            </form>

            <form className="card bg-base-100 p-6 shadow-sm" onSubmit={saveWorkflow}>
              <h2 className="mb-4 text-xl font-black">Configure Workflow</h2>
              <select
                className="select select-bordered mb-4 w-full"
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                required
              >
                <option value="">Select service</option>
                {selectedAgency.services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <div className="space-y-3">
                {workflowRows.map((row, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[80px_160px_1fr]">
                    <input className="input input-bordered" value={row.stepNumber} readOnly />
                    <select
                      className="select select-bordered"
                      value={row.role}
                      onChange={e =>
                        setWorkflowRows(rows =>
                          rows.map((item, rowIndex) => (rowIndex === index ? { ...item, role: e.target.value } : item)),
                        )
                      }
                    >
                      <option value="VERIFIER">Verifier</option>
                      <option value="SIGNER">Signer</option>
                      <option value="ISSUER">Issuer</option>
                    </select>
                    <select
                      className="select select-bordered"
                      value={row.memberId}
                      onChange={e =>
                        setWorkflowRows(rows =>
                          rows.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, memberId: e.target.value } : item,
                          ),
                        )
                      }
                    >
                      <option value="">Assign officer</option>
                      {selectedAgency.members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.email}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setWorkflowRows(rows => [...rows, { stepNumber: rows.length + 1, role: "SIGNER", memberId: "" }])
                  }
                >
                  Add step
                </button>
                <button className="btn btn-secondary">
                  <ArrowPathIcon className="h-5 w-5" />
                  Save workflow
                </button>
              </div>
            </form>

            <div className="grid gap-4">
              {selectedAgency.services.map(service => (
                <div key={service.id} className="card bg-base-100 p-6 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-black">{service.name}</h3>
                      <p className="text-sm text-base-content/60">{service.description || "No description"}</p>
                    </div>
                    <span className="badge badge-secondary">{service.requirementMode}</span>
                    <button
                      className="btn btn-error btn-sm"
                      type="button"
                      onClick={() => setDeleteTarget({ type: "service", id: service.id, label: service.name })}
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {service.workflowSteps.map(step => (
                      <span key={step.id} className="badge badge-ghost">
                        {step.stepNumber}. {step.role} - {step.member.email}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="alert">No agency admin membership found for this NDI identity.</div>
      )}

      {deleteTarget && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="delete-target-title">
          <div className="modal-box max-w-md">
            <div className="mb-5 flex items-center gap-3 text-error">
              <ExclamationTriangleIcon className="h-7 w-7" />
              <h2 id="delete-target-title" className="text-xl font-black">
                Delete {deleteTarget.type}
              </h2>
            </div>
            <p className="text-base-content/70">
              This will remove <strong>{deleteTarget.label}</strong> from active agency configuration. Existing audit
              history remains available.
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} type="button">
                Cancel
              </button>
              <button className="btn btn-error" onClick={confirmDelete} disabled={loading} type="button">
                {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <TrashIcon className="h-5 w-5" />}
                Delete
              </button>
            </div>
          </div>
          <button className="modal-backdrop" onClick={() => setDeleteTarget(null)} type="button">
            Close
          </button>
        </div>
      )}

      <NdiModal isOpen={isNdiModalOpen} onClose={() => setIsNdiModalOpen(false)} onSuccess={load} />
    </main>
  );
};

export default AgencyPage;
