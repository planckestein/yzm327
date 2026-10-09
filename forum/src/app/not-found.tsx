import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Bulunamadi() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 py-20 text-center">
      <div className="ust-etiket">Hata · 404</div>
      <h1 className="text-3xl leading-tight font-semibold">Bu sayfa bulunamadı.</h1>
      <p className="text-muted-foreground">Bağlantı yanlış olabilir ya da içerik kaldırılmış olabilir.</p>
      <Button asChild className="mt-4">
        <Link href="/">Gündeme dön</Link>
      </Button>
    </div>
  );
}
