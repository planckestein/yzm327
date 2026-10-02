"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { MenuKategorisi } from "@/lib/akis";
import { SolMenu } from "./SolMenu";

export function MobilMenu(props: { kategoriler: MenuKategorisi[]; oyBekleyen: number }) {
  const [acik, setAcik] = useState(false);
  return (
    <Sheet open={acik} onOpenChange={setAcik}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Menüyü aç">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto bg-background p-4">
        <SheetHeader className="cizgi-cift mt-6 p-0 pt-3 pb-4">
          <SheetTitle className="font-serif text-3xl font-black tracking-tight">
            Ortak Akıl<span className="text-vurgu">.</span>
          </SheetTitle>
        </SheetHeader>
        <SolMenu {...props} onSec={() => setAcik(false)} />
      </SheetContent>
    </Sheet>
  );
}
