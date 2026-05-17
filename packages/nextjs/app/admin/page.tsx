"use client";

import { useEffect, useState } from "react";
import {
  ArrowPathIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  TrashIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
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

const STATUS_STYLES: Record<string, string> = {
  active: "badge-success text-success-content",
  pending: "badge-warning text-warning-content",
  suspended: "badge-error text-error-content",
};

function AgencyInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-base border border-primary/20">
      {initials || <BuildingOfficeIcon className="h-6 w-6" />}
    </div>
  );
}

const AdminPage = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isNdiModalOpen, setIsNdiModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminCid, setAdminCid] = useState("");
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const filtered = agencies.filter(
    a =>
      a.name.toLowerCase().includes(search.toLowerCase()) || a.adminEmail.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = agencies.filter(a => a.status === "active").length;
  const pendingCount = agencies.filter(a => a.status === "pending").length;

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 flex flex-col gap-6 border-b border-base-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary">
            Platform Admin
          </div>
          <h1 className="text-4xl font-black text-base-content tracking-tight">Agency Enrollment</h1>
          <p className="mt-2 max-w-xl text-base-content/50 text-sm leading-relaxed">
            Enroll government agencies, issue admin invitations, and monitor registration status across the platform.
          </p>
        </div>
        <button
          className="btn btn-primary h-12 px-6 shadow-lg shadow-primary/20 gap-2"
          onClick={() => setIsNdiModalOpen(true)}
        >
          <FingerPrintIcon className="h-5 w-5" />
          NDI Login
        </button>
      </div>

      {/* Stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Agencies", value: agencies.length, icon: BuildingOfficeIcon, color: "text-primary" },
          { label: "Active", value: activeCount, icon: CheckCircleIcon, color: "text-success" },
          { label: "Pending", value: pendingCount, icon: ArrowPathIcon, color: "text-warning" },
        ].map(stat => (
          <div
            key={stat.label}
            className="card bg-base-100 border border-base-200 shadow-sm px-6 py-5 flex flex-row items-center gap-4"
          >
            <div className={`rounded-xl bg-base-200 p-2.5 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-base-content leading-none">{stat.value}</p>
              <p className="text-xs font-bold text-base-content/40 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-error/10 bg-error/5 p-4 text-error">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
        {/* Enrollment Form */}
        <section className="self-start">
          <div className="rounded-3xl border border-base-200 bg-base-100 shadow-sm overflow-hidden">
            <div className="border-b border-base-200 px-8 py-5">
              <h2 className="text-lg font-black text-base-content">Enroll New Agency</h2>
              <p className="text-xs text-base-content/40 font-medium mt-0.5">
                An invitation will be sent to the admin email.
              </p>
            </div>
            <form className="flex flex-col gap-6 px-8 py-7" onSubmit={enroll}>
              <div className="flex w-full flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-base-content/40">Agency Name</label>
                <input
                  className="h-12 w-full rounded-xl border border-base-300 bg-base-200/40 px-4 font-semibold text-base-content outline-none transition focus:border-primary focus:bg-base-100 text-sm"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ministry of Finance"
                  required
                />
              </div>

              <div className="flex w-full flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-base-content/40">Admin Email</label>
                <input
                  className="h-12 w-full rounded-xl border border-base-300 bg-base-200/40 px-4 font-semibold text-base-content outline-none transition focus:border-primary focus:bg-base-100 text-sm"
                  type="email"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@agency.gov.bt"
                  required
                />
              </div>

              <div className="flex w-full flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-widest text-base-content/40">Admin CID</label>
                <input
                  className="h-12 w-full rounded-xl border border-base-300 bg-base-200/40 px-4 font-semibold text-base-content outline-none transition focus:border-primary focus:bg-base-100 text-sm"
                  value={adminCid}
                  onChange={e => setAdminCid(e.target.value)}
                  placeholder="Admin's citizen ID"
                  required
                />
              </div>

              <button
                className="btn btn-primary mt-2 h-10 w-fit self-center px-8 gap-2 text-sm shadow-md shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5" />
                )}
                Send Invitation
              </button>
            </form>
          </div>
        </section>

        {/* Agencies List */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-black text-base-content">Enrolled Agencies</h2>
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" />
              <input
                className="h-10 w-full rounded-xl border border-base-300 bg-base-100 pl-9 pr-4 text-sm font-medium text-base-content outline-none transition focus:border-primary"
                placeholder="Search agencies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading && agencies.length === 0 ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-base-200" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-base-300 bg-base-200/20 py-16 text-center">
              <BuildingOfficeIcon className="h-10 w-10 text-base-content/20" />
              <p className="font-black text-base-content/40 text-sm">
                {search ? "No agencies match your search." : "No agencies enrolled yet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(agency => (
                <div
                  key={agency.id}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-base-200 bg-base-100 px-6 py-4 shadow-sm transition hover:border-primary/20 hover:shadow-md"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <AgencyInitials name={agency.name} />
                    <div className="min-w-0">
                      <h3 className="font-black text-base-content text-sm leading-tight truncate">{agency.name}</h3>
                      <p className="text-xs text-base-content/50 font-medium mt-0.5 truncate">{agency.adminEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-base-content/40">
                      <span className="flex items-center gap-1">
                        <UserGroupIcon className="h-3.5 w-3.5" />
                        {agency.memberCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
                        {agency.serviceCount}
                      </span>
                    </div>
                    <span
                      className={`badge badge-sm font-bold capitalize px-2.5 py-2 rounded-lg ${STATUS_STYLES[agency.status] ?? "badge-neutral"}`}
                    >
                      {agency.status}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm h-9 w-9 p-0 rounded-xl text-base-content/30 hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition"
                      onClick={() => setAgencyToDelete(agency)}
                      type="button"
                      title="Delete Agency"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Delete Modal */}
      {agencyToDelete && (
        <div
          className="modal modal-open bg-base-300/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-agency-title"
        >
          <div className="modal-box max-w-sm bg-base-100 shadow-2xl p-8 rounded-3xl border border-error/10">
            <div className="mb-5 flex items-center gap-3 text-error">
              <div className="h-10 w-10 rounded-2xl bg-error/10 flex items-center justify-center shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5" />
              </div>
              <h2 id="delete-agency-title" className="text-xl font-black">
                Delete Agency
              </h2>
            </div>
            <p className="text-sm text-base-content/60 leading-relaxed mb-7">
              Removing <strong className="text-base-content">{agencyToDelete.name}</strong> will disable all its
              services and remove members from agency workflows. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                className="btn btn-ghost flex-1 h-12 font-bold bg-base-200/60 hover:bg-base-200"
                onClick={() => setAgencyToDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="btn btn-error flex-1 h-12 gap-2 shadow-md shadow-error/20"
                onClick={deleteAgency}
                disabled={loading}
                type="button"
              >
                {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <TrashIcon className="h-5 w-5" />}
                Delete
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
