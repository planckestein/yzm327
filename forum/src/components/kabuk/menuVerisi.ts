import { BookOpen, Newspaper, Scale, TrendingUp, Users } from "lucide-react";

export const ANA_BAGLANTILAR = [
  { href: "/", ad: "Gündem", ikon: Newspaper },
  { href: "/kararlar", ad: "Kararlar", ikon: Scale },
  { href: "/etki", ad: "Etki", ikon: TrendingUp },
  { href: "/topluluk", ad: "Topluluk", ikon: Users },
  { href: "/hakkinda", ad: "Nasıl işliyor?", ikon: BookOpen },
] as const;

export function aktifMi(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/konu");
  if (href === "/kararlar") return pathname.startsWith("/kararlar") || pathname.startsWith("/karar/");
  return pathname.startsWith(href);
}
