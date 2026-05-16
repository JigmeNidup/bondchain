"use client";

import Link from "next/link";
import { SwitchTheme } from "~~/components/SwitchTheme";

export const Footer = () => {
  return (
    <footer className="border-t border-base-300 bg-base-100 px-4 py-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-base-content/70 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0">BondChain - NDI-gated signing with on-chain verification</p>
        <div className="flex items-center gap-4">
          <Link className="link-hover" href="/history">
            History
          </Link>
          <Link className="link-hover" href="/verify/demo">
            Verify
          </Link>
          <SwitchTheme />
        </div>
      </div>
    </footer>
  );
};
