"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SEKMELER = [
  { href: "/topluluk", ad: "Yayın Kurulu" },
  { href: "/topluluk/uyeler", ad: "Üyeler" },
  { href: "/topluluk/graf", ad: "Graf" },
  { href: "/topluluk/defter", ad: "Açık Arşiv" },
];

export function ToplulukSekmeleri() {
  const yol = usePathname();
  return (
    <nav className="flex gap-5 overflow-x-auto border-b">
      {SEKMELER.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={cn(
            "-mb-px border-b-[3px] border-transparent py-2 text-[12px] font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground",
            yol === s.href && "border-vurgu text-foreground",
          )}
        >
          {s.ad}
        </Link>
      ))}
    </nav>
  );
}
