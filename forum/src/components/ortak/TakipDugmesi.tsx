import { BellPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { takipDegistir } from "@/app/actions/konu";

export function TakipDugmesi({ kategoriId, takipte, boyut = "sm" }: { kategoriId: number; takipte: boolean; boyut?: "sm" | "default" }) {
  return (
    <form action={takipDegistir}>
      <input type="hidden" name="kategori_id" value={kategoriId} />
      <Button type="submit" size={boyut} variant={takipte ? "secondary" : "outline"}>
        {takipte ? <Check /> : <BellPlus />}
        {takipte ? "Takip ediliyor" : "Takip et"}
      </Button>
    </form>
  );
}
