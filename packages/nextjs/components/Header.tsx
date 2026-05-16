"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bars3Icon,
  ClockIcon,
  DocumentCheckIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useOutsideClick } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Onboard",
    href: "/onboard",
    icon: <FingerPrintIcon className="h-4 w-4" />,
  },
  {
    label: "User Signing",
    href: "/user-to-user",
    icon: <UserGroupIcon className="h-4 w-4" />,
  },
  {
    label: "API Sign",
    href: "/sign",
    icon: <DocumentCheckIcon className="h-4 w-4" />,
  },
  {
    label: "History",
    href: "/history",
    icon: <ClockIcon className="h-4 w-4" />,
  },
  {
    label: "Verify",
    href: "/verify/demo",
    icon: <ShieldCheckIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-primary text-primary-content shadow-md scale-105" : "text-base-content/60"
              } hover:bg-base-300 hover:text-primary hover:shadow-sm focus:!bg-primary focus:!text-primary-content active:!bg-primary py-2 px-4 text-sm font-bold rounded-xl gap-2 grid grid-flow-col transition-all duration-300`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky top-0 navbar bg-base-100/30 backdrop-blur-xl min-h-0 shrink-0 justify-between z-30 shadow-sm border-b border-base-300/50 px-0 sm:px-4 transition-all duration-300">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-base-100 rounded-box w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link
          href="/"
          passHref
          className="hidden lg:flex items-center gap-3 ml-4 mr-8 shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className="flex relative w-10 h-10 shadow-sm rounded-xl overflow-hidden border border-base-300">
            <Image
              alt="BondChain logo"
              className="cursor-pointer object-contain p-1 transition-all dark:invert dark:brightness-200"
              fill
              src="/logo.png"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-black leading-tight text-lg tracking-tight">BondChain</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary/60">Digital Sovereignty</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-4"></div>
    </div>
  );
};
