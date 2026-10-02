import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Bulunamadi() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-20 text-center">
      <div className="ust-etiket">Hata · 404</div>
      <h1 className="font-serif text-5xl leading-none font-black tracking-tight">Bu sayfa baskıya girmedi.</h1>
      <p className="font-serif text-lg text-muted-foreground italic">Bağlantı yanlış olabilir ya da içerik kaldırılmış olabilir.</p>
      <Button asChild className="mt-4">
        <Link href="/">Ön sayfaya dön</Link>
      </Button>
    </div>
  );
}
