"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { kayitOl, type FormDurumu } from "@/app/actions/hesap";

export default function KayitFormu() {
  const [durum, gonder, bekliyor] = useActionState<FormDurumu, FormData>(kayitOl, {});
  const a = durum.alanlar ?? {};

  return (
    <form action={gonder} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="ad">Ad</Label>
          <Input id="ad" name="ad" autoComplete="given-name" required defaultValue={a.ad} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="soyad">Soyad</Label>
          <Input id="soyad" name="soyad" autoComplete="family-name" required defaultValue={a.soyad} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="takma_ad">Takma ad</Label>
        <Input id="takma_ad" name="takma_ad" autoComplete="username" required minLength={3} maxLength={20} defaultValue={a.takma_ad} />
        <p className="text-xs text-muted-foreground">Kurultay’da herkes seni bu adla görür. 3-20 karakter; harf, rakam ve _</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="dogum_tarihi">Doğum tarihi</Label>
          <Input id="dogum_tarihi" name="dogum_tarihi" type="date" required defaultValue={a.dogum_tarihi} />
        </div>
        <div className="grid gap-2 sm:row-span-2">
          <Label htmlFor="adres">Adres</Label>
          <Textarea id="adres" name="adres" rows={4} required autoComplete="street-address" defaultValue={a.adres} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sifre">Şifre</Label>
          <Input id="sifre" name="sifre" type="password" autoComplete="new-password" required minLength={8} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sifre2">Şifre (tekrar)</Label>
        <Input id="sifre2" name="sifre2" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <p className="text-xs text-muted-foreground">Doğum tarihin ve adresin yalnızca sana görünür.</p>
      {durum.hata && (
        <Alert variant="destructive">
          <AlertDescription>{durum.hata}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={bekliyor} className="w-full">
        {bekliyor ? "Hesap oluşturuluyor…" : "Kayıt ol"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Zaten üye misin?{" "}
        <Link href="/giris" className="font-medium text-primary hover:underline">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
