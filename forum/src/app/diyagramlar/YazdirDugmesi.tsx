"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Sayfayı yazdırır ya da PDF olarak kaydettirir (tarayıcının yazdırma penceresi). */
export function YazdirDugmesi() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer /> Yazdır ya da PDF kaydet
    </Button>
  );
}
