"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BuildingOfficeIcon, DocumentTextIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { bondchainFetch } from "~~/utils/bondchainApi";

type Service = {
  id: string;
  name: string;
  description?: string | null;
  requirementMode: string;
  agency: { name: string };
  workflowSteps: { id: string }[];
};

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    bondchainFetch<{ services: Service[] }>("/services")
      .then(response => setServices(response.services))
      .catch(err => setError(err instanceof Error ? err.message : "Unable to load services"));
  }, []);

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return services;
    return services.filter(service =>
      [service.name, service.description || "", service.agency.name, service.requirementMode]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, services]);

  return (
    <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 border-b border-base-300 pb-8">
        <div className="mb-4 inline-flex rounded-full border border-secondary/10 bg-secondary/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary">
          Citizen Services
        </div>
        <h1 className="text-3xl font-black text-base-content">Agency Services</h1>
        <p className="mt-3 max-w-2xl text-base-content/60">
          Submit NDI-gated service requests and route them through agency workflows.
        </p>
      </div>

      <label className="input input-bordered mb-8 flex h-14 items-center gap-3">
        <MagnifyingGlassIcon className="h-5 w-5 text-base-content/40" />
        <input
          className="grow"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search by service, agency, requirement, or description"
          aria-label="Search agency services"
        />
      </label>

      {error && <div className="alert alert-error mb-6">{error}</div>}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredServices.map(service => (
          <Link
            key={service.id}
            href={`/services/${service.id}`}
            className="card bg-base-100 p-6 shadow-sm transition hover:-translate-y-1"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <BuildingOfficeIcon className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black">{service.name}</h2>
            <p className="mt-2 text-sm font-bold text-secondary">{service.agency.name}</p>
            <p className="mt-3 min-h-12 text-sm text-base-content/60">
              {service.description || "Agency service request"}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="badge badge-primary">{service.requirementMode}</span>
              <span className="badge badge-ghost">{service.workflowSteps.length} steps</span>
            </div>
          </Link>
        ))}
      </div>
      {services.length === 0 && !error && (
        <div className="alert">
          <DocumentTextIcon className="h-5 w-5" />
          No active agency services yet.
        </div>
      )}
      {services.length > 0 && filteredServices.length === 0 && (
        <div className="alert">
          <DocumentTextIcon className="h-5 w-5" />
          No services match your search.
        </div>
      )}
    </main>
  );
};

export default ServicesPage;
