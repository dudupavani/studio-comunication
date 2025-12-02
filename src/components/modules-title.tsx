"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getModuleTitle } from "@/lib/modules";
import { MODULE_TITLES } from "@/lib/modules";
import { ArrowLeft } from "lucide-react";

export default function ModuleTitle() {
  const pathname = usePathname();
  const title = getModuleTitle(pathname ?? "");

  // Descobre a rota base (prefixo) para linkar ao índice (fallback null)
  const basePath =
    pathname &&
    Object.keys(MODULE_TITLES).find((path) => pathname.startsWith(path));
  const isOnBasePath = basePath === pathname;

  return (
    <h1 className="text-lg sm:text-xl font-bold tracking-tight">
      {basePath && !isOnBasePath ? (
        <Link
          href={basePath}
          className="group inline-flex items-center gap-2 hover:ml-6 transition-all ease-in-out duration-200">
          <ArrowLeft className="h-6 w-6 absolute text-gray-500 opacity-0 -translate-x-1 transition-all ease-in-out duration-200 group-hover:opacity-100 group-hover:-translate-x-7" />
          <span>{title}</span>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-2">
          <ArrowLeft className="h-6 w-6 absolute opacity-0" />
          <span>{title}</span>
        </span>
      )}
    </h1>
  );
}
