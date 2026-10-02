"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { yoneticiKarariVer, type IslemDurumu } from "@/app/actions/oylama";

export function YoneticiKarari({ surecId }: { surecId: number }) {
  const [durum, gonder, bekliyor] = useActionState<IslemDurumu, FormData>(yoneticiKarariVer, {});
  return (
    <form action={gonder} className="mt-3 grid gap-3">
      <input type="hidden" name="surec_id" value={surecId} />
      <Textarea name="gerekce" rows={2} placeholder="Gerekçe (veto edersen herkes görecek)" />
      <div className="flex flex-wrap gap-2">
        <Button name="karar" value="onay" disabled={bekliyor} className="bg-success text-white hover:bg-success/90">
          <Check /> Onayla
        </Button>
        <Button name="karar" value="veto" variant="destructive" disabled={bekliyor}>
          <X /> Veto et
        </Button>
      </div>
      {durum.hata && <p className="text-sm text-destructive">{durum.hata}</p>}
    </form>
  );
}
