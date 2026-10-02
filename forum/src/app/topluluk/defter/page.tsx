import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defterDogrula, defterKayitlari } from "@/lib/defter";
import { tamTarih } from "@/lib/bicim";

export const metadata: Metadata = { title: "Açık Arşiv" };

const TUR_ADLARI: Record<string, string> = {
  uye_katildi: "Üyelik",
  konu_onerildi: "Konu",
  mesaj: "Mesaj",
  oy: "Oy",
  surec: "Karar",
  secim: "Seçim",
  azinlik_gorusu: "Azınlık görüşü",
  kurum_tepkisi: "Kurum tepkisi",
};

function ozet(tur: string, v: Record<string, unknown>): string {
  switch (tur) {
    case "uye_katildi":
      return `@${v.takma_ad} foruma katıldı${v.yapay_zeka ? " (yapay zeka)" : ""}`;
    case "konu_onerildi":
      return `“${v.baslik}” önerildi (${v.kategori})`;
    case "mesaj":
      return `@${v.yazan}, konu #${v.konu_id}'e mesaj yazdı`;
    case "oy": {
      const adina = (v.adina_oy_kullanilanlar as string[]) ?? [];
      return `@${v.oy_veren} “${v.secim === "evet" ? "evet" : "hayır"}” dedi (karar #${v.surec_id})${adina.length ? ` · ${adina.map((a) => "@" + a).join(", ")} adına da` : ""}`;
    }
    case "surec":
      return `Karar #${v.surec_id}: ${v.olay}`;
    case "secim":
      return v.olay === "destek_verdi"
        ? `@${v.destekleyen}, @${v.aday} adayını destekledi`
        : v.olay === "destek_cekildi"
          ? `@${v.destekleyen}, @${v.aday} adayından desteğini çekti`
          : v.olay === "aday_oldu"
            ? `@${v.aday} ${v.makam === "yonetici" ? "Genel Yayın Yönetmenliğine" : "Yayın Kurulu’na"} aday oldu`
            : `@${v.aday} adaylıktan çekildi`;
    case "kurum_tepkisi":
      return `@${v.kurum}, konu #${v.konu_id} için resmî tepki bildirdi (${v.durum})`;
    case "azinlik_gorusu":
      return `Konu #${v.konu_id}'e azınlık görüşü eklendi`;
    default:
      return tur;
  }
}

export default async function DefterSayfasi({ searchParams }: PageProps<"/topluluk/defter">) {
  const once = Number((await searchParams).once) || undefined;
  const d = defterDogrula();
  const kayitlar = defterKayitlari(40, once);
  const enEski = kayitlar.at(-1)?.sira;

  return (
    <div className="flex flex-col gap-5">
      <div data-tur="defter" className={`flex flex-wrap items-center gap-4 border-2 p-4 ${d.gecerli ? "border-success" : "border-destructive"}`}>
        {d.gecerli ? <ShieldCheck className="size-8 shrink-0 text-success" /> : <ShieldAlert className="size-8 shrink-0 text-destructive" />}
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{d.gecerli ? "Zincir sağlam" : `Zincir bozuk: #${d.bozukSira} değiştirilmiş`}</div>
          <p className="text-sm text-muted-foreground">
            {d.kayit} kaydın tamamı şu an baştan sona yeniden hesaplandı. Her kayıt bir öncekinin SHA-256 özetini içerdiği için geçmişte
            tek bir kayıt değişse zincir bozulur.
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">son özet: {d.sonHash}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/defter/indir">
            <Download /> Defteri indir
          </a>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Herkes defterin bir kopyasını indirip saklayabilir; sonradan forumdaki defterle karşılaştırarak geçmişin değiştirilmediğini
        kendisi doğrulayabilir. Kişisel bilgiler ve mesaj metinleri deftere yazılmaz, yalnızca özetleri yazılır.
      </p>

      <ol className="divide-y border-y border-foreground">
        {kayitlar.map((k) => (
          <li key={k.sira} className="grid gap-1 py-3 sm:grid-cols-[64px_120px_1fr] sm:items-center sm:gap-3">
            <span className="font-mono text-xs text-muted-foreground">#{k.sira}</span>
            <span className="text-[10px] font-bold tracking-[0.12em] text-vurgu uppercase">{TUR_ADLARI[k.tur] ?? k.tur}</span>
            <div className="min-w-0">
              <div className="text-sm">{ozet(k.tur, JSON.parse(k.veri))}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground" title={`önceki: ${k.onceki_hash}\nbu kayıt: ${k.hash}`}>
                {tamTarih(k.zaman)} · {k.onceki_hash.slice(0, 10)}… → {k.hash.slice(0, 10)}…
              </div>
            </div>
          </li>
        ))}
      </ol>
      {enEski && enEski > 1 && (
        <Button asChild variant="outline" className="self-center">
          <Link href={`/topluluk/defter?once=${enEski}`}>Daha eski kayıtlar</Link>
        </Button>
      )}
    </div>
  );
}
