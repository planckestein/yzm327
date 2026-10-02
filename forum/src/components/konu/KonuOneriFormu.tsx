"use client";

import { useActionState, useState } from "react";
import { GitBranch, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { konuOner, type OneriDurumu } from "@/app/actions/konu";

type Props = {
  kategoriler?: { id: number; ad: string; derinlik: number }[];
  seciliKategori?: number;
  ustKonuId?: number;
};

export function KonuOneriFormu({ kategoriler, seciliKategori, ustKonuId }: Props) {
  const [durum, gonder, bekliyor] = useActionState<OneriDurumu, FormData>(konuOner, {});
  const a = durum.alanlar ?? {};

  return (
    <form action={gonder} className="grid gap-5">
      {ustKonuId ? (
        <input type="hidden" name="ust_konu_id" value={ustKonuId} />
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="kategori">Bölüm</Label>
          <select
            id="kategori"
            name="kategori_id"
            required
            defaultValue={a.kategori_id ?? seciliKategori ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="" disabled>
              Bir bölüm seç…
            </option>
            {kategoriler?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.derinlik ? "    " : ""}
                {k.ad}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="baslik">Başlık</Label>
        <Input id="baslik" name="baslik" required maxLength={150} defaultValue={a.baslik} placeholder="Tartışılmasını istediğin soru ya da konu" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="aciklama">Açıklama</Label>
        <Textarea
          id="aciklama"
          name="aciklama"
          required
          rows={6}
          defaultValue={a.aciklama}
          placeholder="Neden tartışılmalı? Hangi sorulara cevap arıyoruz?"
        />
      </div>

      {durum.hata && (
        <Alert variant="destructive">
          <AlertDescription>
            {durum.denetim?.engeller.length ? durum.denetim.engeller.join(" ") : durum.hata}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Önerin, bölümü takip edenlerin oylamasına sunulur. Çoğunluk kabul ederse gündeme girer ve tartışmaya açılır.
        </p>
        <Button type="submit" disabled={bekliyor}>
          <Send /> {bekliyor ? "Gönderiliyor…" : "Oylamaya sun"}
        </Button>
      </div>
    </form>
  );
}

export function AltKonuDiyalogu({ ustKonuId, ustBaslik }: { ustKonuId: number; ustBaslik: string }) {
  const [acik, setAcik] = useState(false);
  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <GitBranch /> Alt konu öner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Alt konu öner</DialogTitle>
          <DialogDescription>“{ustBaslik}” konusunun altında ayrı bir tartışma açılması için öneri.</DialogDescription>
        </DialogHeader>
        <KonuOneriFormu ustKonuId={ustKonuId} />
      </DialogContent>
    </Dialog>
  );
}
