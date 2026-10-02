"use client";

import { useActionState, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { oyVer, type IslemDurumu } from "@/app/actions/oylama";

/** Evet/Hayır düğmeleri. Oy kesin olduğu için iki adımlı: seç → onayla. */
export function OyDugmeleri({ oylamaId, temsil }: { oylamaId: number; temsil: string[] }) {
  const [durum, gonder, bekliyor] = useActionState<IslemDurumu, FormData>(oyVer, {});
  const [secim, setSecim] = useState<"evet" | "hayir" | null>(null);

  return (
    <form action={gonder} className="flex flex-col gap-2">
      <input type="hidden" name="oylama_id" value={oylamaId} />
      {secim === null ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-success/60 bg-transparent font-semibold text-success hover:bg-success hover:text-background"
            onClick={() => setSecim("evet")}
          >
            <ThumbsUp /> Evet
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 border-destructive/60 bg-transparent font-semibold text-destructive hover:bg-destructive hover:text-background"
            onClick={() => setSecim("hayir")}
          >
            <ThumbsDown /> Hayır
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border border-foreground p-3 text-sm">
          <span>
            <b>{secim === "evet" ? "Evet" : "Hayır"}</b> oyu vereceksin. Oylar geri alınamaz.
          </span>
          <input type="hidden" name="secim" value={secim} />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setSecim(null)} disabled={bekliyor}>
              Vazgeç
            </Button>
            <Button type="submit" size="sm" disabled={bekliyor}>
              {bekliyor ? "Kaydediliyor…" : "Oyu mühürle"}
            </Button>
          </div>
        </div>
      )}
      {temsil.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Oyun, oyunu sana devreden {temsil.map((t) => "@" + t).join(", ")} adına da sayılacak ({temsil.length + 1} oy).
        </p>
      )}
      {durum.hata && <p className="text-sm text-destructive">{durum.hata}</p>}
    </form>
  );
}
