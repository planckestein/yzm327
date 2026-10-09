import type { Metadata } from "next";
import Link from "next/link";
import { Damga } from "@/components/ortak/Durum";
import { db } from "@/lib/db";
import { sayi } from "@/lib/bicim";
import { toplamUye } from "@/lib/kalabalik";
import { forumYoneticisi, tumTemsilciler } from "@/lib/secim";
import { KullaniciAvatar } from "@/components/ortak/KullaniciAvatar";
import { Zaman } from "@/components/ortak/Zaman";

export const metadata: Metadata = { title: "Üyeler" };

export default function UyelerSayfasi() {
  const uyeler = db
    .prepare(
      `SELECT u.takma_ad, u.ad, u.soyad, u.rol, u.olusturma,
              (SELECT COUNT(*) FROM mesajlar m WHERE m.yazan_id = u.id) AS mesaj,
              (SELECT COUNT(*) FROM konular k WHERE k.acan_id = u.id AND k.durum != 'silindi') AS konu,
              (SELECT MAX(m.olusturma) FROM mesajlar m WHERE m.yazan_id = u.id) AS son
       FROM kullanicilar u ORDER BY mesaj DESC, u.id`,
    )
    .all() as { takma_ad: string; ad: string; soyad: string; rol: string; olusturma: string; mesaj: number; konu: number; son: string | null }[];
  const yonetici = forumYoneticisi()?.takma_ad;
  const temsilci = new Map(tumTemsilciler().map((t) => [t.takma_ad, t.kategori_ad]));

  const vatandas = uyeler.filter((u) => u.rol !== "yz" && u.rol !== "resmi").length;

  return (
    <>
    <p className="text-sm text-muted-foreground">
      Toplam <b className="text-foreground">{sayi(toplamUye(vatandas))}</b> kayıtlı üyeden en çok söz alan {uyeler.length} hesap (kurumlar ve
      YZ Analist dahil) gösteriliyor.
    </p>
    <ul className="grid border-t sm:grid-cols-2 sm:[&>li:nth-child(even)]:border-l sm:[&>li:nth-child(even)]:pl-5">
      {uyeler.map((u) => (
        <li key={u.takma_ad} className="border-b">
          <Link href={`/profil/${encodeURIComponent(u.takma_ad)}`} className="group flex gap-3 py-4 pr-4">
            <KullaniciAvatar ad={u.takma_ad} boyut="lg" baglanti={false} rol={u.rol} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-lg font-semibold group-hover:underline">{u.takma_ad}</span>
                {u.takma_ad === yonetici && <Damga className="text-vurgu">Genel Yayın Yönetmeni</Damga>}
                {temsilci.has(u.takma_ad) && <Damga className="text-foreground">Yayın Kurulu · {temsilci.get(u.takma_ad)}</Damga>}
                {u.rol === "bilirkisi" && <Damga className="text-warning">Uzman</Damga>}
                {u.rol === "resmi" && <Damga className="text-foreground">Kurum</Damga>}
                {u.rol === "yz" && <Damga>YZ Analist</Damga>}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {u.ad} {u.soyad}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>
                  <b className="text-foreground">{u.mesaj}</b> mesaj
                </span>
                <span>
                  <b className="text-foreground">{u.konu}</b> konu
                </span>
                {u.son && (
                  <span>
                    son: <Zaman iso={u.son} />
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
    </>
  );
}
