"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Reply, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mesajGonder, type TartismaDurumu } from "@/app/actions/tartisma";

type Props = { konuId: number; yanit?: { id: number; yazan: string; ozet: string } | null; ben: string };

/** Mesaj yazma kutusu. Gönderilince temizlenir. */
export function Besteci({ konuId, yanit, ben }: Props) {
  const [durum, gonder, bekliyor] = useActionState<TartismaDurumu, FormData>(mesajGonder, {});

  return (
    <form action={gonder} key={String(durum.tamam ?? "ilk")} id="yaz" className="cizgi-kalin scroll-mt-28 bg-card px-4 pt-3 pb-4">
      <input type="hidden" name="konu_id" value={konuId} />
      <input type="hidden" name="yanit_id" value={yanit?.id ?? 0} />
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-serif text-lg font-bold">Söz al</span>
        <span className="text-xs text-muted-foreground">@{ben} olarak</span>
      </div>
      {yanit && (
        <div className="mb-2 flex items-center gap-2 border-l-2 border-vurgu pl-2 text-xs text-muted-foreground">
          <Reply className="size-3 -scale-x-100" />
          <span className="truncate">
            <b className="text-foreground">@{yanit.yazan}</b> kullanıcısına yanıt: {yanit.ozet}
          </span>
          <Link href={`/konu/${konuId}#yaz`} scroll={false} className="ml-auto" aria-label="Yanıtı iptal et">
            <X className="size-3.5" />
          </Link>
        </div>
      )}
      <Textarea
        name="icerik"
        required
        rows={4}
        placeholder="Görüşünü, gerekçesiyle yaz…"
        className="resize-y rounded-none border-x-0 border-t-0 border-b border-foreground/40 bg-transparent px-0 font-serif text-[16.5px] shadow-none focus-visible:border-foreground focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Mesajlar düzenlenemez ve silinemez; yalnızca oylamayla gizlenebilir.</span>
        <Button type="submit" size="sm" className="ml-auto" disabled={bekliyor}>
          <Send /> {bekliyor ? "Gönderiliyor…" : "Gönder"}
        </Button>
      </div>
      {durum.hata && <p className="mt-2 text-sm text-destructive">{durum.hata}</p>}
    </form>
  );
}
