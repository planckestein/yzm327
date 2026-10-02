"use client";

import { useActionState, useState } from "react";
import { Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { kuralOner, type KuralOneriDurumu } from "@/app/actions/kural";

type Tanim =
  | { ad: string; tip: "sayi"; min: number; max: number }
  | { ad: string; tip: "secim"; secenekler: { deger: string; ad: string }[] };

const secimSinifi =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function KuralOneriDiyalogu({ tanimlar, mevcut }: { tanimlar: Record<string, Tanim>; mevcut: Record<string, string> }) {
  const [durum, gonder, bekliyor] = useActionState<KuralOneriDurumu, FormData>(kuralOner, {});
  const anahtarlar = Object.keys(tanimlar);
  const [anahtar, setAnahtar] = useState(anahtarlar[0]);
  const t = tanimlar[anahtar];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Gavel /> İlke önerisi yap
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={gonder} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>İlke önerisi</DialogTitle>
            <DialogDescription>
              İlke önerileri tüm üyelerin oylamasından, Yayın Kurulu’ndan ve Genel Yayın Yönetmeni’nin onayından geçer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="anahtar">Değiştirilecek kural</Label>
            <select id="anahtar" name="anahtar" value={anahtar} onChange={(e) => setAnahtar(e.target.value)} className={secimSinifi}>
              {anahtarlar.map((a) => (
                <option key={a} value={a}>
                  {tanimlar[a].ad}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Şu anki değer: {mevcut[anahtar]}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deger">Yeni değer</Label>
            {t.tip === "sayi" ? (
              <Input key={anahtar} id="deger" type="number" name="deger" min={t.min} max={t.max} required />
            ) : (
              <select key={anahtar} id="deger" name="deger" className={secimSinifi}>
                {t.secenekler.map((s) => (
                  <option key={s.deger} value={s.deger}>
                    {s.ad}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gerekce">Gerekçe</Label>
            <Textarea id="gerekce" name="gerekce" rows={3} placeholder="Bu değişiklik neden gerekli?" />
          </div>
          {durum.hata && (
            <Alert variant="destructive">
              <AlertDescription>{durum.hata}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="submit" disabled={bekliyor}>
              {bekliyor ? "Gönderiliyor…" : "Oylamaya sun"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
