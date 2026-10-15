import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mevcutKullanici } from "@/lib/auth";
import { acikKararlar, akisKonulari, menuKategorileri, sonSoz, type AkisKonusu, type KararOzeti } from "@/lib/akis";
import { kalanSure, sayi } from "@/lib/bicim";
import { etkiIstatistikleri, kurumAdlari, sonResmiAciklamalar, sonTepkiler } from "@/lib/etki";
import { suan } from "@/lib/saat";
import { okunma, toplamUye } from "@/lib/kalabalik";
import { AkisSekmeleri, filtreCoz } from "@/components/konu/AkisSekmeleri";
import { KonuTablosu } from "@/components/konu/KonuTablosu";
import { AvatarYigini } from "@/components/ortak/KullaniciAvatar";
import { KategoriRozeti } from "@/components/ortak/KategoriRozeti";
import { EtkiRozeti, KurumYanitiRozeti } from "@/components/ortak/EtkiRozeti";
import { MeclisGrafigi } from "@/components/ortak/MeclisGrafigi";
import { OyCubugu } from "@/components/ortak/OyCubugu";
import { Zaman } from "@/components/ortak/Zaman";
import { TurDugmesi } from "@/components/tur/TurRehberi";
import { OtagCizimi } from "@/components/motif/OtagCizimi";
import { AraBaslik } from "@/components/ortak/SayfaBasligi";
import { KilimSerit, Motif } from "@/components/motif/Motif";
import { bolumMotifi } from "@/components/motif/desenler";
import { ISTER_LISTESI } from "@/components/tur/turAdimlari";

const ozetle = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

export default async function GundemSayfasi({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const filtre = filtreCoz(sp.f);
  const hepsi = sp.hepsi === "1";
  const ben = await mevcutKullanici();
  const konular = akisKonulari(filtre, undefined, hepsi ? 200 : 16);
  const oylamada = akisKonulari("oylamada").length;
  const kararlar = acikKararlar(ben?.id ?? null);

  // Manşet: en çok konuşulan açık tartışma; altında farklı bölümlerden üç haber daha
  const acik = akisKonulari("son").filter((k) => k.durum === "aktif");
  const manset = [...acik].sort((a, b) => b.mesaj_sayisi - a.mesaj_sayisi)[0];
  const ikinciler: AkisKonusu[] = [];
  for (const k of acik) {
    if (ikinciler.length === 3) break;
    if (k.id === manset?.id || ikinciler.some((i) => i.kategori.id === k.kategori.id)) continue;
    ikinciler.push(k);
  }

  return (
    <div className="flex flex-col gap-8">
      <Giris oylamaSayisi={kararlar.filter((k) => k.oylama).length} />

      {manset && (
        <section className="grid gap-8 lg:grid-cols-12">
          <Manset k={manset} />
          <aside className="lg:col-span-4 lg:border-l lg:pl-8" data-tur="meclis">
            <MeclisteBugun kararlar={kararlar} girisli={!!ben} />
          </aside>
        </section>
      )}

      {ikinciler.length > 0 && (
        <section className="grid gap-6 border-t pt-6 md:grid-cols-3 md:gap-0 md:[&>*]:px-6 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0 md:[&>*+*]:border-l">
          {ikinciler.map((k) => (
            <IkinciHaber key={k.id} k={k} />
          ))}
        </section>
      )}

      <section className="grid gap-10 border-t pt-6 lg:grid-cols-12">
        <div id="tartismalar" data-tur="tartismalar" className="scroll-mt-28 lg:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-2">
            <h2 className="text-xl font-semibold">Tüm tartışmalar</h2>
            <AkisSekmeleri aktif={filtre} taban="/" sayilar={{ oylamada }} capa="tartismalar" />
          </div>
          <KonuTablosu
            konular={hepsi ? konular : konular.slice(0, 15)}
            bos={filtre === "oylamada" ? "Şu an oylamada gündem önerisi yok." : "Burada henüz konu yok."}
          />
          {!hepsi && konular.length > 15 && (
            <Link
              href={`/?${filtre === "son" ? "" : `f=${filtre}&`}hepsi=1#tartismalar`}
              scroll={false}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              Tüm arşivi göster <ArrowRight className="size-4" />
            </Link>
          )}
          {ben && (
            <Button asChild variant="outline" className="mt-4 sm:hidden">
              <Link href="/konu/yeni">
                <PenLine /> Gündem öner
              </Link>
            </Button>
          )}
        </div>
        <aside className="flex flex-col gap-8 lg:col-span-4 lg:border-l lg:pl-8">
          <DersProjesi />
          <Rakamlarla />
          <KurumlarNeDedi />
        </aside>
      </section>
    </div>
  );
}

function Giris({ oylamaSayisi }: { oylamaSayisi: number }) {
  const tarih = suan().toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  const bolumler = menuKategorileri();
  return (
    <header className="flex flex-col gap-4" data-tur="kunye">
      <div className="kece-kart relative overflow-hidden">
        <div className="flex items-stretch gap-6 px-5 py-6 sm:px-8 sm:py-7">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{tarih}</span>
              <span aria-hidden>·</span>
              <Link href="/kararlar" className="inline-flex items-center gap-1.5 font-medium text-vurgu hover:underline">
                <span className="size-[7px] rotate-45 bg-current" aria-hidden /> {oylamaSayisi} oylama sürüyor
              </Link>
            </div>
            <h1 className="mt-3 text-[clamp(2.3rem,6vw,4rem)] leading-[0.95] font-bold tracking-[-0.02em] [font-stretch:112%]">Kurultay</h1>
            <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Gündemi üyeler belirler, tartışmayı üyeler yürütür, sonucu üyeler oylar. Eski Türklerde kararın otağda birlikte konuşularak
              alındığı meclis gibi.
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground" title="Göktürk (Orhun) harfleriyle “toy”: eski Türkçede meclis">
              <span className="orhun text-lg leading-none text-foreground">𐱃𐰆𐰖</span>
              <span>
                <i>toy</i>, Orhun yazıtlarının dilinde meclis demek
              </span>
            </p>
          </div>
          <OtagCizimi className="hidden w-40 self-center sm:block lg:w-52" />
        </div>
        <KilimSerit ilmek={2} />
      </div>
      <nav data-tur="bolumler" className="flex flex-wrap gap-2" aria-label="Bölümler">
        {bolumler.map((b) => {
          const m = bolumMotifi(b.ad);
          return (
            <Link
              key={b.id}
              href={`/kategori/${b.id}`}
              className="inline-flex items-center gap-1.5 rounded-[3px] border bg-card px-2.5 py-1 text-sm transition-colors hover:border-foreground/40"
            >
              <Motif ad={m.motif} renk={m.renk} className="size-3.5" />
              {b.ad.split(" ve ")[0]}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function Manset({ k }: { k: AkisKonusu }) {
  const soz = sonSoz(k.id);
  return (
    <article className="lg:col-span-8">
      <div className="flex flex-wrap items-center gap-3">
        <KategoriRozeti {...k.kategori} />
        {k.resmiYanit && <KurumYanitiRozeti />}
      </div>
      <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.25rem)] leading-[1.15] font-semibold">
        <Link href={`/konu/${k.id}`} className="decoration-2 underline-offset-4 hover:underline">
          {k.baslik}
        </Link>
      </h2>
      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <p className="yazi text-foreground/90">{ozetle(k.aciklama, 420)}</p>
        {soz && (
          <figure className="border-t pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <blockquote className="font-serif text-lg leading-snug italic">“{ozetle(soz.icerik, 200)}”</blockquote>
            <figcaption className="mt-2 text-sm text-muted-foreground">
              <Link href={`/konu/${k.id}#m${soz.id}`} className="hover:text-foreground hover:underline">
                @{soz.yazan}, tartışmadan
              </Link>
            </figcaption>
          </figure>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-sm text-muted-foreground">
        <AvatarYigini adlar={k.katilimcilar.slice(0, 5)} />
        <span>
          <b className="font-semibold text-foreground">{k.mesaj_sayisi}</b> yanıt · <b className="font-semibold text-foreground">{sayi(okunma(k.id, k.mesaj_sayisi))}</b> okuma · son söz <Zaman iso={k.son_etkinlik} />
        </span>
        <Link href={`/konu/${k.id}`} className="ml-auto inline-flex items-center gap-1 font-medium text-foreground hover:underline">
          Tartışmayı oku <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function MeclisteBugun({ kararlar, girisli }: { kararlar: KararOzeti[]; girisli: boolean }) {
  const oylamalar = kararlar.filter((k) => k.oylama);
  const [bas, ...digerleri] = [...oylamalar].sort(
    (a, b) => Number(b.oyBekliyor) - Number(a.oyBekliyor) || b.oylama!.secmen - a.oylama!.secmen,
  );
  const bekleyen = oylamalar.filter((k) => k.oyBekliyor).length;

  return (
    <div className="flex flex-col">
      <AraBaslik className="[&_h2]:text-lg" sag={girisli && bekleyen > 0 && <span className="text-xs font-medium text-vurgu">{bekleyen} oy seni bekliyor</span>}>
        Kurultay’da bugün
      </AraBaslik>
      {bas ? (
        <>
          <Link href={`/karar/${bas.id}`} className="group mt-3 block">
            <span className="ust-etiket">
              {bas.turAd} · {bas.asamaAd}
            </span>
            <span className="mt-1 block text-lg leading-snug font-semibold group-hover:underline">{bas.baslik}</span>
            <MeclisGrafigi {...bas.oylama!} className="mx-auto mt-3 max-w-[260px]" />
            <span className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{kalanSure(bas.oylama!.bitis, suan())}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground group-hover:underline">
                {bas.oyBekliyor ? "Oyunu ver" : "Oylamayı gör"} <ArrowRight className="size-3.5" />
              </span>
            </span>
          </Link>
          <ul className="mt-4 divide-y border-t">
            {digerleri.slice(0, 4).map((k) => (
              <li key={k.id}>
                <Link href={`/karar/${k.id}`} className="group block py-2.5">
                  <span className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                    <span>{k.turAd}</span>
                    {k.oyBekliyor && <span className="text-vurgu">Sıra sende</span>}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block leading-snug group-hover:underline">{k.baslik}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <OyCubugu {...k.oylama!} ince className="flex-1" />
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {sayi(k.oylama!.evet)}/{k.oylama!.gereken === null ? "?" : sayi(k.oylama!.gereken)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/kararlar" className="mt-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            Tüm oylamalar →
          </Link>
        </>
      ) : (
        <p className="mt-3 text-muted-foreground italic">Şu an süren oylama yok.</p>
      )}
    </div>
  );
}

function IkinciHaber({ k }: { k: AkisKonusu }) {
  return (
    <article className="group relative flex flex-col">
      <KategoriRozeti {...k.kategori} className="relative z-10" />
      <h3 className="mt-1.5 text-lg leading-snug font-semibold">
        <Link href={`/konu/${k.id}`} className="decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline">
          {k.baslik}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-4 text-[15px] leading-relaxed text-muted-foreground">{k.aciklama}</p>
      <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{k.mesaj_sayisi} yanıt</span> · {sayi(okunma(k.id, k.mesaj_sayisi))} okuma · <Zaman iso={k.son_etkinlik} />
      </div>
    </article>
  );
}

function DersProjesi() {
  return (
    <section className="kece-kart p-4">
      <div className="ust-etiket">Ders projesi</div>
      <h2 className="mt-1 text-lg leading-snug font-semibold">Hocamızın {ISTER_LISTESI.length} isteğinin hepsi burada</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Kurultay, Yazılım Mühendisliği için Yapay Zeka dersinde verilen forum ödevi için yapıldı. Tur, her isteği platformda nerede
        karşıladığımızı sayfa sayfa gösterir.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <TurDugmesi yazi="Tanıtım turunu başlat" />
        <Link href="/hakkinda#istekler" className="text-xs font-semibold hover:underline">
          İstek listesi →
        </Link>
        <Link href="/diyagramlar" className="text-xs font-semibold hover:underline">
          UML diyagramları →
        </Link>
      </div>
    </section>
  );
}

function Rakamlarla() {
  const e = etkiIstatistikleri();
  const RAKAMLAR = [
    { deger: `%${e.oran}`, ad: "uzlaşma kurumların gündemine girdi" },
    { deger: e.resmiAciklama, ad: "resmî açıklama yapıldı" },
    { deger: e.kurum, ad: "kurum burayı takip ediyor" },
    { deger: sayi(toplamUye(e.vatandas)), ad: "kayıtlı üye" },
  ];
  return (
    <section>
      <AraBaslik className="[&_h2]:text-lg">Rakamlarla</AraBaslik>
      <dl className="grid grid-cols-2">
        {RAKAMLAR.map((r, i) => (
          <div key={r.ad} className={`py-3 ${i % 2 ? "border-l pl-4" : "pr-4"} ${i > 1 ? "border-t" : ""}`}>
            <dd className="text-2xl leading-none font-semibold tabular-nums">{r.deger}</dd>
            <dt className="mt-1.5 text-xs leading-snug text-muted-foreground">{r.ad}</dt>
          </div>
        ))}
      </dl>
      <Link href="/etki" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        Etki raporu <ArrowRight className="size-3" />
      </Link>
    </section>
  );
}

function KurumlarNeDedi() {
  const tepkiler = sonTepkiler(3);
  const aciklamalar = sonResmiAciklamalar(2);
  const adlar = kurumAdlari();
  if (!tepkiler.length && !aciklamalar.length) return null;
  return (
    <section>
      <AraBaslik className="[&_h2]:text-lg">Kurumlar ne dedi?</AraBaslik>
      <ul className="divide-y">
        {aciklamalar.map((a) => (
          <li key={`a${a.id}`} className="py-3">
            <Link href={`/konu/${a.konu_id}#m${a.id}`} className="group block">
              <p className="line-clamp-4 font-serif text-[15px] leading-relaxed italic group-hover:underline">“{a.icerik}”</p>
              <span className="mt-1.5 block text-xs font-medium">
                {adlar.get(a.kurum) ?? a.kurum}
                <span className="font-normal tracking-normal text-muted-foreground normal-case">
                  {" "}
                  · <Zaman iso={a.olusturma} />
                </span>
              </span>
            </Link>
          </li>
        ))}
        {tepkiler.map((t) => (
          <li key={`t${t.id}`} className="py-3">
            <Link href={`/konu/${t.konu_id}`} className="group block">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium">{adlar.get(t.kurum) ?? t.kurum}</span>
                <EtkiRozeti durum={t.durum} />
              </span>
              <span className="mt-1 block leading-snug font-semibold group-hover:underline">{t.baslik}</span>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.aciklama}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
