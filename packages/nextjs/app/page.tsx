"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import type { NextPage } from "next";
import { ArrowRightIcon, CheckBadgeIcon, FingerPrintIcon, LinkIcon } from "@heroicons/react/24/outline";

const statusItems = [
  { label: "NDI identity", value: "Session gated", icon: FingerPrintIcon },
  { label: "Privy wallet", value: "Server signing", icon: CheckBadgeIcon },
  { label: "Sepolia audit", value: "On-chain events", icon: LinkIcon },
];

const steps = [
  {
    step: "01",
    title: "Verify Identity",
    copy: "Authenticate via the Bhutan NDI wallet app using secure OIDC flows.",
    icon: FingerPrintIcon,
  },
  {
    step: "02",
    title: "Bind Wallet",
    copy: "Link your DID to a non-custodial cryptographic wallet on the Sepolia testnet.",
    icon: LinkIcon,
  },
  {
    step: "03",
    title: "Immutable Audit",
    copy: "Execute signatures that generate verifiable on-chain audit trails forever.",
    icon: CheckBadgeIcon,
  },
];

const Home: NextPage = () => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-66%"]);

  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(55,48,163,0.08)_0%,transparent_100%)] dark:opacity-20" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-6 text-primary bg-primary/5 border border-primary/10 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
              Institutional Civic Infrastructure
            </div>

            <h1 className="text-5xl font-black tracking-tight text-base-content sm:text-7xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              Securing Digital <br />
              <span className="text-primary">Trust in Bhutan</span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-base-content/70 mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
              BondChain combines Bhutan NDI sovereign identity with immutable blockchain signatures to provide
              verifiable proof of origin for every civic action.
            </p>

            <div className="flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <Link href="/onboard" className="btn btn-primary h-14 px-10 text-lg shadow-xl">
                Register Identity
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Link>
              <Link href="/sign" className="btn btn-outline h-14 px-10 text-lg border-2 hover:bg-base-300">
                Signing Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Status Section */}
      <section className="py-12 bg-base-100/40 border-y border-base-300 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {statusItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-6 p-4 rounded-2xl transition-all hover:bg-base-100/60">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary shadow-inner border border-primary/10">
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-base-content/40 m-0">{label}</p>
                  <p className="text-xl font-extrabold text-base-content m-0 mt-1">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Horizontal Scroll Process Section */}
      <section ref={targetRef} className="relative h-[300vh] bg-base-200/50">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full absolute top-24 left-0 right-0 z-20 pointer-events-none">
            <h2 className="text-3xl font-black text-base-content">The BondChain Protocol</h2>
            <p className="mt-4 text-base-content/60 max-w-lg">
              A decentralized bridge between national identity and digital trust.
            </p>
          </div>

          <motion.div style={{ x }} className="flex gap-8 px-[10vw] md:px-[25vw]">
            {steps.map(item => (
              <div
                key={item.step}
                className="card w-[75vw] md:w-[480px] shrink-0 p-10 md:p-12 group relative overflow-hidden bg-base-100 border-base-300 shadow-md transition-transform duration-500 hover:-translate-y-2"
              >
                <div className="absolute top-0 right-0 p-6 text-7xl font-black text-base-content/5 opacity-[0.03] group-hover:opacity-10 group-hover:text-primary transition-all duration-700">
                  {item.step}
                </div>

                <div className="relative flex flex-col gap-8 items-start">
                  <div className="h-16 w-16 shrink-0 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                    <item.icon className="h-8 w-8" />
                  </div>

                  <div className="flex-1">
                    <div className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 mb-4">
                      Phase {item.step}
                    </div>
                    <h3 className="text-2xl font-black text-base-content mb-4">{item.title}</h3>
                    <p className="text-base text-base-content/60 leading-relaxed m-0">{item.copy}</p>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-0 group-hover:w-full transition-all duration-700" />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pt-12 pb-24 px-4 bg-base-200/30">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[3rem] bg-base-100 border border-base-300 p-12 md:p-24 shadow-2xl">
            {/* Background Aesthetics */}
            <div className="absolute -top-24 -left-24 h-96 w-96 bg-primary/5 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -right-24 h-96 w-96 bg-secondary/5 rounded-full blur-[100px]" />

            <div className="relative flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="flex items-center gap-4 md:gap-8 mb-8">
                <div className="relative w-12 h-12 md:w-24 md:h-24 shrink-0 opacity-40 dark:invert dark:brightness-200">
                  <Image src="/left.svg" alt="" fill className="object-contain" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-base-content tracking-tight whitespace-nowrap">
                  Ready to Request <span className="text-primary">a Signature?</span>
                </h2>
                <div className="relative w-12 h-12 md:w-24 md:h-24 shrink-0 opacity-40 dark:invert dark:brightness-200">
                  <Image src="/right.svg" alt="" fill className="object-contain" />
                </div>
              </div>
              <p className="text-xl text-base-content/60 leading-relaxed mb-12">
                Invite others to sign your documents securely using Bhutan NDI. A simple, auditable, and sovereign way
                to execute digital agreements.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
                <Link href="/user-to-user" className="btn btn-primary h-14 px-12 text-lg font-black">
                  Create Request
                </Link>
                <Link
                  href="/history"
                  className="btn btn-ghost border-base-300 hover:bg-base-200 text-base-content h-14 px-12 text-lg font-bold backdrop-blur-md"
                >
                  View Archive
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
