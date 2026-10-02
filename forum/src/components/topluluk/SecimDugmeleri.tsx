"use client";

import { useActionState } from "react";
import { Check, Plus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adayOl, adayliktanCekil, destekVer, type SecimDurumu } from "@/app/actions/secim";

export function DestekDugmesi({ adayId, destekliyor }: { adayId: number; destekliyor: boolean }) {
  const [durum, gonder, bekliyor] = useActionState<SecimDurumu, FormData>(destekVer, {});
  return (
    <form action={gonder} className="flex flex-col items-end gap-1">
      <input type="hidden" name="aday_id" value={adayId} />
      <Button size="xs" variant={destekliyor ? "secondary" : "outline"} disabled={bekliyor}>
        {destekliyor ? <Check /> : <Plus />}
        {destekliyor ? "Destekliyorsun" : "Destekle"}
      </Button>
      {durum.hata && <span className="max-w-48 text-right text-[11px] text-destructive">{durum.hata}</span>}
    </form>
  );
}

export function AdayOlDugmesi({ makam, kategoriId, yazi }: { makam: "temsilci" | "yonetici"; kategoriId?: number; yazi: string }) {
  const [durum, gonder, bekliyor] = useActionState<SecimDurumu, FormData>(adayOl, {});
  return (
    <form action={gonder} className="flex flex-col gap-1">
      <input type="hidden" name="makam" value={makam} />
      <input type="hidden" name="kategori_id" value={kategoriId ?? 0} />
      <Button size="sm" variant="outline" disabled={bekliyor} className="self-start">
        <Plus /> {yazi}
      </Button>
      {durum.hata && <span className="text-xs text-destructive">{durum.hata}</span>}
    </form>
  );
}

export function CekilDugmesi() {
  return (
    <form action={adayliktanCekil}>
      <Button size="xs" variant="ghost" className="text-muted-foreground">
        <UserMinus /> Çekil
      </Button>
    </form>
  );
}
