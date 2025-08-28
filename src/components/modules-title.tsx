"use client";

import { usePathname } from "next/navigation";
import { getModuleTitle } from "@/lib/modules";

export default function ModuleTitle() {
  const pathname = usePathname();
  const title = getModuleTitle(pathname);

  return <h1 className="text-xl font-bold tracking-tight">{title}</h1>;
}
