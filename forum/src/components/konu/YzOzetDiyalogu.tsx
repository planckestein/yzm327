"use client";

import { useActionState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { yzOzetiIste } from "@/app/actions/yz";
import type { TartismaDurumu } from "@/app/actions/tartisma";

/** "Özetle" düğmesi: YZ Analist analizini gösterir; istenirse özeti tartışmaya ekler. */
export function YzOzetDiyalogu({ konuId, ekleyebilir, children }: { konuId: number; ekleyebilir: boolean; children: React.ReactNode }) {
  const [durum, gonder, bekliyor] = useActionState<TartismaDurumu, FormData>(yzOzetiIste, {});
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Sparkles /> YZ Analist özeti
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-5 text-success" /> YZ Analist özeti
          </DialogTitle>
          <DialogDescription>Ücretsiz, kural tabanlı analiz. Hatalı olabilir; YZ Analist oy kullanmaz.</DialogDescription>
        </DialogHeader>
        {children}
        {ekleyebilir && (
          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {durum.hata && <p className="text-sm text-destructive sm:mr-auto">{durum.hata}</p>}
            {durum.tamam && <p className="text-sm text-success sm:mr-auto">Özet tartışmaya eklendi.</p>}
            <form action={gonder}>
              <input type="hidden" name="konu_id" value={konuId} />
              <Button type="submit" disabled={bekliyor || !!durum.tamam} className="w-full">
                <Bot /> {bekliyor ? "Ekleniyor…" : "Özeti tartışmaya ekle"}
              </Button>
            </form>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
