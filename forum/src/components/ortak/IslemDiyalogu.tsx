"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type IslemSonucu = { hata?: string; tamam?: number | string };
export type Alan = { ad: string; etiket: string; tip?: "metin" | "uzun"; deger?: string; zorunlu?: boolean; ipucu?: string; satir?: number };

type Props = {
  tetik: React.ReactNode; // pencereyi açan öğe (genelde bir Button)
  baslik: string;
  aciklama?: string;
  islem: (onceki: IslemSonucu, form: FormData) => Promise<IslemSonucu>;
  gizli?: Record<string, string | number>;
  alanlar: Alan[];
  dugme: string;
  bilgi?: React.ReactNode; // form üstünde gösterilecek ek içerik
};

/** Öneri başlatan formlar için açılır pencere. Başarılı olursa kapanır (öneriler zaten karar sayfasına yönlendirir). */
export function IslemDiyalogu({ tetik, baslik, aciklama, islem, gizli = {}, alanlar, dugme, bilgi }: Props) {
  const [acik, setAcik] = useState(false);
  const [durum, gonder, bekliyor] = useActionState<IslemSonucu, FormData>(async (onceki, form) => {
    const sonuc = await islem(onceki, form);
    if (sonuc.tamam) setAcik(false);
    return sonuc;
  }, {});

  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>{tetik}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={gonder} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{baslik}</DialogTitle>
            {aciklama && <DialogDescription>{aciklama}</DialogDescription>}
          </DialogHeader>
          {bilgi}
          {Object.entries(gizli).map(([ad, deger]) => (
            <input key={ad} type="hidden" name={ad} value={deger} />
          ))}
          {alanlar.map((a) => (
            <div key={a.ad} className="grid gap-2">
              <Label htmlFor={`f-${a.ad}`}>{a.etiket}</Label>
              {a.tip === "uzun" ? (
                <Textarea id={`f-${a.ad}`} name={a.ad} defaultValue={a.deger} required={a.zorunlu} rows={a.satir ?? 4} placeholder={a.ipucu} />
              ) : (
                <Input id={`f-${a.ad}`} name={a.ad} defaultValue={a.deger} required={a.zorunlu} placeholder={a.ipucu} />
              )}
            </div>
          ))}
          {durum.hata && (
            <Alert variant="destructive">
              <AlertDescription>{durum.hata}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAcik(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={bekliyor}>
              {bekliyor ? "Gönderiliyor…" : dugme}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
