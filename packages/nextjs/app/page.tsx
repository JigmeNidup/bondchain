"use client";

import Link from "next/link";
import type { NextPage } from "next";
import {
  ArrowRightIcon,
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  FingerPrintIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

const statusItems = [
  { label: "NDI identity", value: "Session gated", icon: FingerPrintIcon },
  { label: "Privy wallet", value: "Server signing", icon: CheckBadgeIcon },
  { label: "Sepolia audit", value: "On-chain events", icon: LinkIcon },
];

const Home: NextPage = () => {
  return (
    <main className="min-h-dvh bg-base-200">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              <div>
                <p className="m-0 text-sm font-semibold uppercase text-primary">BondChain</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-base-content sm:text-4xl">
                  NDI-gated document signing with on-chain audit trails
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-base-content/75">
                  Onboard a Bhutan NDI identity, bind it to a Privy-controlled wallet, and use that wallet for document
                  signatures recorded on Sepolia.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/onboard" className="btn btn-primary min-h-11 rounded-lg">
                  Start onboarding
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/sign" className="btn btn-outline min-h-11 rounded-lg">
                  Signing overlay
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {statusItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="h-5 w-5 text-secondary-content" />
                  </span>
                  <div>
                    <p className="m-0 text-sm text-base-content/65">{label}</p>
                    <p className="m-0 text-lg font-semibold">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Onboard", "NDI proof creates a short-lived session before wallet provisioning."],
            ["2", "Bind wallet", "The backend registers the DID-to-wallet linkage hash on-chain."],
            ["3", "Sign", "Notesheet requests redirect users into the BondChain signing overlay."],
          ].map(([step, title, copy]) => (
            <div key={step} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral text-sm font-semibold text-neutral-content">
                  {step}
                </span>
                <h2 className="m-0 text-lg font-semibold">{title}</h2>
              </div>
              <p className="mb-0 mt-4 text-sm leading-6 text-base-content/70">{copy}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-primary" />
              <div>
                <h2 className="m-0 text-lg font-semibold">Notesheet API</h2>
                <p className="m-0 text-sm text-base-content/70">`POST /api/signing/initiate` returns a redirect URL.</p>
              </div>
            </div>
            <Link href="/sign" className="btn btn-sm btn-outline min-h-11 rounded-lg">
              Open overlay
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
