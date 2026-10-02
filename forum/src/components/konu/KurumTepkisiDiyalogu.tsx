"use client";

import { useActionState, useState } from "react";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { kurumTepkisiBildir } from "@/app/actions/etki";
import type { TartismaDurumu } from "@/app/actions/tartisma";

const SECENEKLER = [
  { deger: "inceleniyor", ad: "İnceleniyor" },
  { deger: "gundemde", ad: "Gündeme alındı (çalışma gündemi / yasa taslağı)" },
  { deger: "uygulandi", ad: "Uygulandı" },
  { deger: "reddedildi", ad: "Gerekçeli ret" },
];

export function KurumTepkisiDiyalogu({ konuId, kurumAdi }: { konuId: number; kurumAdi: string }) {
  const [acik, setAcik] = useState(false);
  const [durum, gonder, bekliyor] = useActionState<TartismaDurumu, FormData>(async (o, f) => {
    const r = await kurumTepkisiBildir(o, f);
    if (r.tamam) setAcik(false);
    return r;
  }, {});

  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>
        <Button>
          <Landmark /> Resmî tepki bildir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={gonder} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{kurumAdi} adına resmî tepki</DialogTitle>
            <DialogDescription>
              Tepkin konunun altında ve Etki raporunda herkese açık görünür. Silinemez; tutumun değişirse yeni bir tepki bildirirsin ve
              eskisi geçmişte kalır.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="konu_id" value={konuId} />
          <div className="grid gap-2">
            <Label htmlFor="durum">Tutum</Label>
            <select
              id="durum"
              name="durum"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {SECENEKLER.map((s) => (
                <option key={s.deger} value={s.deger}>
                  {s.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="aciklama">Açıklama</Label>
            <Textarea id="aciklama" name="aciklama" rows={4} required placeholder="Kamuoyuna açıklamanız…" />
          </div>
          {durum.hata && (
            <Alert variant="destructive">
              <AlertDescription>{durum.hata}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="submit" disabled={bekliyor}>
              {bekliyor ? "Gönderiliyor…" : "Yayınla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
