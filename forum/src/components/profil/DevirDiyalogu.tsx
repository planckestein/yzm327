"use client";

import { useActionState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { oyDevret, type IslemDurumu } from "@/app/actions/oylama";

type Props = { alan: string; kategoriler: { id: number; ad: string; derinlik: number }[]; maksimum: number };

export function DevirDiyalogu({ alan, kategoriler, maksimum }: Props) {
  const [durum, gonder, bekliyor] = useActionState<IslemDurumu, FormData>(oyDevret, {});
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 /> Oyumu devret
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={gonder} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Oyunu @{alan} kullansın</DialogTitle>
            <DialogDescription>
              İsteğe bağlı. Katılamadığın oylamalarda, seçtiğin kategoride oyunu @{alan} senin adına kullanır. Sen önce oy verirsen
              kendi oyun geçerli olur. Devir zincirleme toplanır; bir kişi en fazla {maksimum} oy taşıyabilir. İstediğin zaman geri
              alabilirsin.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="alan" value={alan} />
          <div className="grid gap-2">
            <Label htmlFor="kategori_id">Hangi oylamalarda?</Label>
            <select
              id="kategori_id"
              name="kategori_id"
              required
              defaultValue=""
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="" disabled>
                Seç…
              </option>
              <option value="0">Tüm platform (ilke önerileri dahil)</option>
              {kategoriler.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.derinlik ? "    " : ""}
                  {k.ad}
                </option>
              ))}
            </select>
          </div>
          {durum.hata && (
            <Alert variant="destructive">
              <AlertDescription>{durum.hata}</AlertDescription>
            </Alert>
          )}
          {durum.tamam && (
            <Alert>
              <AlertDescription>{durum.tamam}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="submit" disabled={bekliyor}>
              {bekliyor ? "Kaydediliyor…" : "Devret"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
