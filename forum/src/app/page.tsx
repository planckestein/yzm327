import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mevcutKullanici } from "@/lib/auth";
import { acikKararlar, akisKonulari, menuKategorileri, sonSoz, yayinSayisi, type AkisKonusu, type KararOzeti } from "@/lib/akis";
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
      <BuyukKunye oylamaSayisi={kararlar.filter((k) => k.oylama).length} />

      {manset && (
        <section className="grid gap-8 lg:grid-cols-12">
          <Manset k={manset} />
          <aside className="lg:col-span-4 lg:border-l lg:pl-8" data-tur="meclis">
            <MeclisteBugun kararlar={kararlar} girisli={!!ben} />
          </aside>
        </section>
      )}

      {ikinciler.length > 0 && (
        <section className="cizgi-kalin grid gap-6 pt-5 md:grid-cols-3 md:gap-0 md:[&>*]:px-6 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0 md:[&>*+*]:border-l">
          {ikinciler.map((k) => (
            <IkinciHaber key={k.id} k={k} />
          ))}
        </section>
      )}

      <section className="cizgi-cift grid gap-10 pt-5 lg:grid-cols-12">
        <div id="tartismalar" data-tur="tartismalar" className="scroll-mt-28 lg:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-2">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Tüm tartışmalar</h2>
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
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:text-vurgu"
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

function BuyukKunye({ oylamaSayisi }: { oylamaSayisi: number }) {
  const simdi = suan();
  const tarih = simdi.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
  const bolumler = menuKategorileri();
  return (
    <header className="flex flex-col" data-tur="kunye">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b pb-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        <span>
          Sayı {yayinSayisi(simdi)} · {tarih}
        </span>
        <span className="hidden sm:inline">Bağımsız kamuoyu platformu</span>
        <Link href="/kararlar" className="inline-flex items-center gap-1.5 text-vurgu hover:underline">
          <span className="canli-nokta size-1.5 rounded-full bg-current" /> {oylamaSayisi} canlı oylama
        </Link>
      </div>
      <h1 className="yazit defne py-4 text-center font-serif text-[clamp(2.2rem,8.5vw,6.5rem)] leading-[0.9] font-black tracking-[-0.035em]">
        Ortak Akıl<span className="text-vurgu">.</span>
      </h1>
      <p className="pb-3 text-center font-serif text-[15px] text-muted-foreground italic sm:text-lg">
        Kamuoyunun sansürsüz sesi. Gündemi okur belirler, tartışmayı okur yürütür, sonucu okur oylar.
      </p>
      <nav
        data-tur="bolumler"
        className="cizgi-cift flex flex-wrap justify-center gap-x-1 gap-y-1 border-b pt-2 pb-2 text-[12px] font-semibold tracking-[0.08em] uppercase"
        aria-label="Bölümler"
      >
        {bolumler.map((b, i) => (
          <span key={b.id} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="text-border" aria-hidden>
                |
              </span>
            )}
            <Link href={`/kategori/${b.id}`} className="px-1.5 text-muted-foreground hover:text-vurgu">
              {b.ad.split(" ve ")[0]}
            </Link>
          </span>
        ))}
      </nav>
    </header>
  );
}

function Manset({ k }: { k: AkisKonusu }) {
  const soz = sonSoz(k.id);
  return (
    <article className="lg:col-span-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-vurgu px-1.5 py-0.5 text-[10px] font-bold tracking-[0.16em] text-vurgu-foreground uppercase">Manşet</span>
        <KategoriRozeti {...k.kategori} />
        {k.resmiYanit && <KurumYanitiRozeti />}
      </div>
      <h2 className="mt-3 font-serif text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.02] font-bold tracking-[-0.02em]">
        <Link href={`/konu/${k.id}`} className="decoration-vurgu decoration-[3px] underline-offset-[6px] hover:underline">
          {k.baslik}
        </Link>
      </h2>
      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <p className="ilk-harf yazi text-foreground/90">{ozetle(k.aciklama, 420)}</p>
        {soz && (
          <figure className="border-t-2 border-foreground pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <span className="block font-serif text-6xl leading-[0.5] text-vurgu" aria-hidden>
              “
            </span>
            <blockquote className="mt-1 font-serif text-xl leading-snug font-medium italic">{ozetle(soz.icerik, 200)}</blockquote>
            <figcaption className="mt-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              —{" "}
              <Link href={`/konu/${k.id}#m${soz.id}`} className="hover:text-foreground">
                @{soz.yazan}, tartışmadan
              </Link>
            </figcaption>
          </figure>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-sm text-muted-foreground">
        <AvatarYigini adlar={k.katilimcilar.slice(0, 5)} />
        <span>
          <b className="font-semibold text-foreground">{k.mesaj_sayisi}</b> yanıt · <b className="font-semibold text-foreground">{sayi(okunma(k.id, k.mesaj_sayisi))}</b> okuma · son söz <Zaman iso={k.son_etkinlik} />
        </span>
        <Link href={`/konu/${k.id}`} className="ml-auto inline-flex items-center gap-1 font-semibold text-foreground hover:text-vurgu">
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
      <div className="flex items-baseline justify-between border-b border-foreground pb-1.5">
        <h2 className="font-serif text-xl font-bold">Meclis’te bugün</h2>
        {girisli && bekleyen > 0 && <span className="text-[11px] font-bold tracking-[0.1em] text-vurgu uppercase">{bekleyen} oy seni bekliyor</span>}
      </div>
      {bas ? (
        <>
          <Link href={`/karar/${bas.id}`} className="group mt-3 block">
            <span className="ust-etiket">
              {bas.turAd} · {bas.asamaAd}
            </span>
            <span className="mt-1 block font-serif text-lg leading-snug font-semibold group-hover:underline">{bas.baslik}</span>
            <MeclisGrafigi {...bas.oylama!} className="mx-auto mt-3 max-w-[260px]" />
            <span className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{kalanSure(bas.oylama!.bitis, suan())}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground group-hover:text-vurgu">
                {bas.oyBekliyor ? "Oyunu ver" : "Oylamayı gör"} <ArrowRight className="size-3.5" />
              </span>
            </span>
          </Link>
          <ul className="mt-4 divide-y border-t">
            {digerleri.slice(0, 4).map((k) => (
              <li key={k.id}>
                <Link href={`/karar/${k.id}`} className="group block py-2.5">
                  <span className="flex items-center justify-between gap-2 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                    <span>{k.turAd}</span>
                    {k.oyBekliyor && <span className="text-vurgu">Sıra sende</span>}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block font-serif leading-snug group-hover:underline">{k.baslik}</span>
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
        <p className="mt-3 font-serif text-muted-foreground italic">Şu an süren oylama yok.</p>
      )}
    </div>
  );
}

function IkinciHaber({ k }: { k: AkisKonusu }) {
  return (
    <article className="group relative flex flex-col">
      <KategoriRozeti {...k.kategori} className="relative z-10" />
      <h3 className="mt-1.5 font-serif text-[22px] leading-tight font-bold">
        <Link href={`/konu/${k.id}`} className="decoration-vurgu decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline">
          {k.baslik}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-4 font-serif text-[15px] leading-relaxed text-muted-foreground">{k.aciklama}</p>
      <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{k.mesaj_sayisi} yanıt</span> · {sayi(okunma(k.id, k.mesaj_sayisi))} okuma · <Zaman iso={k.son_etkinlik} />
      </div>
    </article>
  );
}

function DersProjesi() {
  return (
    <section className="border-2 border-foreground p-4">
      <div className="ust-etiket">Ders projesi</div>
      <h2 className="mt-1 font-serif text-xl leading-tight font-bold">Hocamızın {ISTER_LISTESI.length} isteğinin hepsi burada</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Ortak Akıl, Yazılım Mühendisliği için Yapay Zeka dersinde verilen forum ödevi için yapıldı. Tur, her isteği platformda nerede
        karşıladığımızı sayfa sayfa gösterir.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <TurDugmesi yazi="Tanıtım turunu başlat" />
        <Link href="/hakkinda#istekler" className="text-xs font-semibold hover:text-vurgu">
          İstek listesi →
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
      <div className="border-b border-foreground pb-1.5">
        <h2 className="font-serif text-xl font-bold">Rakamlarla</h2>
      </div>
      <dl className="grid grid-cols-2">
        {RAKAMLAR.map((r, i) => (
          <div key={r.ad} className={`py-3 ${i % 2 ? "border-l pl-4" : "pr-4"} ${i > 1 ? "border-t" : ""}`}>
            <dd className="font-serif text-4xl leading-none font-bold tabular-nums">{r.deger}</dd>
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
      <div className="border-b border-foreground pb-1.5">
        <h2 className="font-serif text-xl font-bold">Kurumlar ne dedi?</h2>
      </div>
      <ul className="divide-y">
        {aciklamalar.map((a) => (
          <li key={`a${a.id}`} className="py-3">
            <Link href={`/konu/${a.konu_id}#m${a.id}`} className="group block">
              <p className="line-clamp-4 font-serif text-[15px] leading-relaxed italic group-hover:underline">“{a.icerik}”</p>
              <span className="mt-1.5 block text-[11px] font-bold tracking-[0.1em] uppercase">
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
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase">{adlar.get(t.kurum) ?? t.kurum}</span>
                <EtkiRozeti durum={t.durum} />
              </span>
              <span className="mt-1 block font-serif leading-snug font-semibold group-hover:underline">{t.baslik}</span>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.aciklama}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
