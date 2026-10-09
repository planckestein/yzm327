"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { MenuKategorisi } from "@/lib/akis";
import { SolMenu } from "./SolMenu";
import { Logo } from "./Logo";

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
        <SheetHeader className="mt-6 border-b p-0 pb-4">
          <SheetTitle>
            <Logo className="text-2xl" />
          </SheetTitle>
        </SheetHeader>
        <SolMenu {...props} onSec={() => setAcik(false)} />
      </SheetContent>
    </Sheet>
  );
}
