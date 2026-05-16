import React from "react";
import Link from "next/link";
import { SwitchTheme } from "~~/components/SwitchTheme";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <footer className="mt-auto py-8 px-4 border-t border-base-300 bg-base-100">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-4 text-[11px] font-black uppercase tracking-[0.15em] text-base-content/40">
          <Link href="/" className="text-base-content tracking-tighter normal-case text-lg mr-2">
            BondChain
          </Link>
          <Link href="/" className="hover:text-primary transition-colors">
            Platform
          </Link>
          <Link href="/onboard" className="hover:text-primary transition-colors">
            Identity
          </Link>
          <Link href="/history" className="hover:text-primary transition-colors">
            Archive
          </Link>
          <a href="#" className="hover:text-primary transition-colors">
            Governance
          </a>
          <a href="#" className="hover:text-primary transition-colors">
            Documentation
          </a>
        </div>

        <div className="flex items-center gap-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-base-content/20 m-0">
            © {new Date().getFullYear()} BondChain · Built for Bhutan
          </p>
          <SwitchTheme className="pointer-events-auto scale-75" />
        </div>
      </div>
    </footer>
  );
};
