"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { girisYap, type FormDurumu } from "@/app/actions/hesap";

export default function GirisFormu() {
  const [durum, gonder, bekliyor] = useActionState<FormDurumu, FormData>(girisYap, {});
  return (
    <form action={gonder} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="takma_ad">Takma ad</Label>
        <Input id="takma_ad" name="takma_ad" autoComplete="username" required defaultValue={durum.alanlar?.takma_ad} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sifre">Şifre</Label>
        <Input id="sifre" name="sifre" type="password" autoComplete="current-password" required />
      </div>
      {durum.hata && (
        <Alert variant="destructive">
          <AlertDescription>{durum.hata}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={bekliyor} className="w-full">
        {bekliyor ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="font-medium text-primary hover:underline">
          Kayıt ol
        </Link>
      </p>
    </form>
  );
}
