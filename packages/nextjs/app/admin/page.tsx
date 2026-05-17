"use client";

import { useEffect, useState } from "react";
import {
  ArrowPathIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { NdiModal } from "~~/components/NdiModal";
import { bondchainFetch } from "~~/utils/bondchainApi";

type Agency = {
  id: string;
  name: string;
  status: string;
  adminEmail: string;
  memberCount: number;
  serviceCount: number;
};

const AdminPage = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminCid, setAdminCid] = useState("");
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await bondchainFetch<{ agencies: Agency[] }>("/admin/agencies");
      setAgencies(response.agencies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin access requires NDI login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const enroll = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await bondchainFetch("/admin/agencies", { method: "POST", json: { name, adminEmail, adminCid } });
      setName("");
      setAdminEmail("");
      setAdminCid("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enroll agency");
    } finally {
      setLoading(false);
    }
  };

  const deleteAgency = async () => {
    if (!agencyToDelete) return;
    setLoading(true);
    setError("");
    try {
      await bondchainFetch(`/admin/agencies/${agencyToDelete.id}`, { method: "DELETE" });
      setAgencyToDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete agency");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-6 border-b border-base-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            Platform Admin
          </div>
          <h1 className="text-3xl font-black text-base-content">Agency Enrollment</h1>
          <p className="mt-3 max-w-2xl text-base-content/60">
            Enroll agencies, send agency admin invitations, and monitor registration status.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsNdiModalOpen(true)}>
          <FingerPrintIcon className="h-5 w-5" />
          NDI Login
        </button>
      </div>

      {error && <div className="alert alert-warning mb-6">{error}</div>}

      <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <form className="card bg-base-100 p-6 shadow-sm" onSubmit={enroll}>
          <h2 className="mb-6 text-xl font-black">Enroll Agency</h2>
          <label className="form-control mb-4">
            <span className="label-text font-bold">Agency name</span>
            <input className="input input-bordered" value={name} onChange={e => setName(e.target.value)} required />
          </label>
          <label className="form-control mb-4">
            <span className="label-text font-bold">Agency admin email</span>
            <input
              className="input input-bordered"
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              required
            />
          </label>
          <label className="form-control mb-6">
            <span className="label-text font-bold">Agency admin CID</span>
            <input
              className="input input-bordered"
              value={adminCid}
              onChange={e => setAdminCid(e.target.value)}
              required
            />
          </label>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PaperAirplaneIcon className="h-5 w-5" />}
            Send invitation
          </button>
        </form>

        <section className="grid content-start gap-4">
          {agencies.map(agency => (
            <div key={agency.id} className="card bg-base-100 p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-secondary/10 p-3 text-secondary">
                    <BuildingOfficeIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{agency.name}</h3>
                    <p className="text-sm text-base-content/60">{agency.adminEmail}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-primary">{agency.status}</span>
                  <span className="badge badge-ghost">{agency.memberCount} members</span>
                  <span className="badge badge-ghost">{agency.serviceCount} services</span>
                  <button className="btn btn-error btn-sm" onClick={() => setAgencyToDelete(agency)} type="button">
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && agencies.length === 0 && <div className="alert">No agencies enrolled yet.</div>}
        </section>
      </div>

      {agencyToDelete && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="delete-agency-title">
          <div className="modal-box max-w-md">
            <div className="mb-5 flex items-center gap-3 text-error">
              <ExclamationTriangleIcon className="h-7 w-7" />
              <h2 id="delete-agency-title" className="text-xl font-black">
                Delete agency
              </h2>
            </div>
            <p className="text-base-content/70">
              This will remove <strong>{agencyToDelete.name}</strong> from active agency lists, disable its services,
              and remove active members from agency workflows.
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setAgencyToDelete(null)} type="button">
                Cancel
              </button>
              <button className="btn btn-error" onClick={deleteAgency} disabled={loading} type="button">
                {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <TrashIcon className="h-5 w-5" />}
                Delete agency
              </button>
            </div>
          </div>
          <button className="modal-backdrop" onClick={() => setAgencyToDelete(null)} type="button">
            Close
          </button>
        </div>
      )}

      <NdiModal isOpen={isNdiModalOpen} onClose={() => setIsNdiModalOpen(false)} onSuccess={load} />
    </main>
  );
};

export default AdminPage;
