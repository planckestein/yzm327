import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, FileEdit, Handshake, History, Landmark, Lock, MessageSquareQuote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mevcutKullanici } from "@/lib/auth";
import { altKonuSatirlari, kategoriEtiketi, konuKararlari } from "@/lib/akis";
import { tamTarih } from "@/lib/bicim";
import { konuGetir, ustKonuZinciri } from "@/lib/konular";
import { hedefSureci, konuUzlasmasi } from "@/lib/oylama";
import { konuMesajlari, konuSerhleri, konuSurumleri, serhYazabilirMi } from "@/lib/tartisma";
import { tartismayiAnalizEt } from "@/lib/yz";
import { konuTepkileri, kurumAdlari } from "@/lib/etki";
import { konuDuzenlemeOnerisi, konuSilmeOnerisi, serhEkle, uzlasmaOnerisi } from "@/app/actions/tartisma";
import { AvatarYigini, KullaniciAdi, KullaniciAvatar } from "@/components/ortak/KullaniciAvatar";
import { KategoriRozeti } from "@/components/ortak/KategoriRozeti";
import { KonuDurumRozeti } from "@/components/ortak/Durum";
import { IslemDiyalogu } from "@/components/ortak/IslemDiyalogu";
import { Zaman } from "@/components/ortak/Zaman";
import { OyKarti } from "@/components/karar/OyKarti";
import { KararListesi } from "@/components/karar/KararListesi";
import { Gonderi, type GonderiVerisi } from "@/components/konu/Gonderi";
import { Besteci } from "@/components/konu/Besteci";
import { KonuTablosu } from "@/components/konu/KonuTablosu";
import { AltKonuDiyalogu } from "@/components/konu/KonuOneriFormu";
import { YzOzetDiyalogu } from "@/components/konu/YzOzetDiyalogu";
import { YzAnalizi } from "@/components/konu/YzAnalizi";
import { KurumTepkisiDiyalogu } from "@/components/konu/KurumTepkisiDiyalogu";
import { EtkiRozeti } from "@/components/ortak/EtkiRozeti";

export async function generateMetadata({ params }: PageProps<"/konu/[id]">): Promise<Metadata> {
  const konu = konuGetir(Number((await params).id));
  return { title: konu?.baslik ?? "Konu" };
}

const ozetle = (s: string) => (s.length > 110 ? s.slice(0, 110) + "…" : s);

export default async function KonuSayfasi({ params, searchParams }: PageProps<"/konu/[id]">) {
  const konu = konuGetir(Number((await params).id));
  if (!konu) notFound();
  const yanitId = Number((await searchParams).yanit) || null;

  const ben = await mevcutKullanici();
  const kategori = kategoriEtiketi(konu.kategori_id);
  const ustler = ustKonuZinciri(konu);
  const kabulSureci = hedefSureci("konu_ac", konu.id);
  const kararlar = konuKararlari(konu.id, ben?.id ?? null);
  const suren = kararlar.filter((k) => k.durum === "suruyor");
  const biten = kararlar.filter((k) => k.durum !== "suruyor");
  const mesajlar = konuMesajlari(konu.id);
  const uzlasma = konuUzlasmasi(konu.id);
  const altlar = altKonuSatirlari(konu.id);
  const surumler = konuSurumleri(konu.id);
  const rapor = JSON.parse(konu.uygunluk_rapor) as { notlar: string[] };
  const acik = konu.durum === "aktif";
  const tartismaVar = konu.durum === "aktif" || konu.durum === "kapandi" || konu.durum === "silindi";
  const katilimcilar = [...new Set([konu.acan_takma_ad, ...mesajlar.map((m) => m.yazan)])];
  const acikSilmeler = new Map(suren.filter((k) => k.tur === "mesaj_sil").map((k) => [k.hedefId, k.id]));
  const kurumlar = kurumAdlari();
  const benKurum = ben?.rol === "resmi";
  const tepkiler = konu.durum === "kapandi" ? konuTepkileri(konu.id) : null;
  const acanKurum = kurumlar.has(konu.acan_takma_ad);
  const oylamaSayisi = suren.filter((k) => k.oylama).length + (konu.durum === "oylamada" && kabulSureci ? 1 : 0);

  const numara = new Map(mesajlar.map((m, i) => [m.id, i + 1]));
  const gonderiler: GonderiVerisi[] = mesajlar.map((m) => {
    const y = m.yanit_id ? mesajlar.find((x) => x.id === m.yanit_id) : undefined;
    return {
      id: m.id,
      sira: numara.get(m.id)!,
      yazan: m.yazan,
      rol: m.yazan_rol,
      gorunenAd: kurumlar.get(m.yazan),
      icerik: m.icerik,
      olusturma: m.olusturma,
      gizleyenKarar: m.gizleyen_surec_id,
      konuAcan: m.yazan === konu.acan_takma_ad,
      yanit: y ? { id: y.id, yazan: y.yazan, ozet: y.gizleyen_surec_id ? "(gizlenmiş mesaj)" : ozetle(y.icerik) } : null,
    };
  });
  const yanitlanan = yanitId ? gonderiler.find((g) => g.id === yanitId && !g.gizleyenKarar) : undefined;

  return (
    <div className="flex flex-col">
      {/* Başlık */}
      <header className="flex flex-col gap-3 pb-5">
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          <Link href="/" className="hover:text-foreground">
            Gündem
          </Link>
          {ustler.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-2">
              <span aria-hidden>›</span>
              <Link href={`/konu/${u.id}`} className="max-w-[16rem] truncate hover:text-foreground">
                {u.baslik}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <KategoriRozeti {...kategori} />
          {konu.durum !== "aktif" && <KonuDurumRozeti durum={konu.durum} />}
        </div>
        <h1 className="max-w-4xl font-serif text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em]">{konu.baslik}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <KullaniciAvatar ad={konu.acan_takma_ad} rol={acanKurum ? "resmi" : undefined} boyut="sm" />
          <span>
            <KullaniciAdi ad={konu.acan_takma_ad} className="text-foreground" /> açtı ·{" "}
            {new Date(konu.olusturma).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
          <span aria-hidden>·</span>
          <span>
            {katilimcilar.length} katılımcı, {mesajlar.length} yanıt
          </span>
          {oylamaSayisi > 0 && (
            <a href="#oylamalar" className="inline-flex items-center gap-1 font-semibold text-vurgu lg:hidden">
              <ArrowDown className="size-3.5" /> {oylamaSayisi} süren oylama
            </a>
          )}
        </div>
      </header>

      <div className="cizgi-cift grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Makale ve tartışma */}
        <article className="flex min-w-0 flex-col gap-6">
          {konu.durum === "reddedildi" && (
            <p className="border-l-2 border-destructive pl-4 font-serif text-muted-foreground italic">
              Bu öneri oylamada kabul edilmedi, bu yüzden tartışmaya açılmadı.{" "}
              {kabulSureci && (
                <Link href={`/karar/${kabulSureci.id}`} className="font-sans font-semibold text-foreground not-italic hover:underline">
                  Oylamayı gör
                </Link>
              )}
            </p>
          )}
          {konu.durum === "silindi" && (
            <p className="flex items-center gap-2 border-l-2 border-foreground pl-4 font-serif text-muted-foreground italic">
              <Lock className="size-4 shrink-0" /> Bu konu oylamayla listelerden kaldırıldı. Şeffaflık için kayıt burada korunuyor.
            </p>
          )}

          {uzlasma && (
            <section className="border-2 border-foreground p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] uppercase">
                  <Handshake className="size-4" /> Varılan uzlaşma
                </span>
                <Link href={`/karar/${uzlasma.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                  {uzlasma.kapanis && new Date(uzlasma.kapanis).toLocaleDateString("tr-TR", { dateStyle: "long" })} · oylamayla kabul →
                </Link>
              </div>
              <p className="metin mt-3 font-serif text-xl leading-snug font-medium">{(JSON.parse(uzlasma.veri) as { metin: string }).metin}</p>
            </section>
          )}

          {tepkiler && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground pb-1.5">
                <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
                  <Landmark className="size-4" /> Kurumların tepkisi
                </h2>
                {benKurum && ben && <KurumTepkisiDiyalogu konuId={konu.id} kurumAdi={kurumlar.get(ben.takma_ad) ?? ben.takma_ad} />}
              </div>
              {tepkiler.guncel.length ? (
                <ul className="divide-y">
                  {tepkiler.guncel.map((t) => (
                    <li key={t.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[12px] font-bold tracking-[0.08em] uppercase">{kurumlar.get(t.kurum) ?? t.kurum}</span>
                        <EtkiRozeti durum={t.durum} />
                      </div>
                      <p className="metin mt-1 font-serif">{t.aciklama}</p>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <Zaman iso={t.zaman} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 font-serif text-muted-foreground italic">Uzlaşma ilgili kurumlara iletildi; henüz yanıt gelmedi.</p>
              )}
              {tepkiler.gecmis.length > tepkiler.guncel.length && (
                <p className="text-xs text-muted-foreground">Önceki tepkiler dahil {tepkiler.gecmis.length} kayıt var; hepsi Açık Arşiv’de.</p>
              )}
            </section>
          )}

          {/* Konunun açıklaması: makalenin girişi */}
          <p className="ilk-harf metin yazi text-[18px]">{konu.aciklama}</p>

          {tartismaVar && (
            <section className="flex flex-col" data-tur="tartisma">
              <div className="flex items-baseline justify-between border-b border-foreground pb-1.5">
                <h2 className="font-serif text-xl font-bold">Tartışma</h2>
                <span className="text-xs text-muted-foreground">{mesajlar.length} yanıt · mesajlar silinmez</span>
              </div>
              {gonderiler.length ? (
                <div className="divide-y">
                  {gonderiler.map((g) => (
                    <Gonderi
                      key={g.id}
                      g={g}
                      konuId={konu.id}
                      girisli={!!ben}
                      yazilabilir={acik}
                      acikSilmeKarari={g.id ? acikSilmeler.get(g.id) : undefined}
                      benKurum={benKurum}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-6 font-serif text-muted-foreground italic">Henüz kimse söz almadı. İlk sözü sen söyle.</p>
              )}
            </section>
          )}

          {acik &&
            (ben ? (
              <Besteci
                konuId={konu.id}
                ben={ben.takma_ad}
                yanit={yanitlanan?.id ? { id: yanitlanan.id, yazan: yanitlanan.yazan, ozet: ozetle(yanitlanan.icerik) } : null}
              />
            ) : (
              <div className="border-y border-foreground py-4 text-center font-serif">
                Tartışmaya katılmak için{" "}
                <Link href="/giris" className="font-semibold underline decoration-vurgu underline-offset-4">
                  giriş yap
                </Link>{" "}
                ya da{" "}
                <Link href="/kayit" className="font-semibold underline decoration-vurgu underline-offset-4">
                  kayıt ol
                </Link>
                .
              </div>
            ))}

          {konu.durum === "kapandi" && <AzinlikGorusleri konuId={konu.id} ben={ben} />}

          {altlar.length > 0 && (
            <section>
              <div className="border-b border-foreground pb-1.5">
                <h2 className="font-serif text-xl font-bold">Alt konular</h2>
              </div>
              <KonuTablosu konular={altlar} bos="" />
            </section>
          )}

          <details className="group border-t">
            <summary className="flex cursor-pointer items-center gap-2 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <History className="size-4" /> Konu geçmişi ve uygunluk raporu
              <span className="ml-auto text-xs font-normal">{konu.uygunluk_puani}/100</span>
            </summary>
            <div className="grid gap-5 pb-4 text-sm">
              {kabulSureci && (
                <p>
                  Konu önerisinin oylaması:{" "}
                  <Link href={`/karar/${kabulSureci.id}`} className="font-semibold underline decoration-vurgu underline-offset-4">
                    karar sürecini gör
                  </Link>
                </p>
              )}
              {biten.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">Sonuçlanan öneriler</h3>
                  <KararListesi kararlar={biten} bos="" />
                </div>
              )}
              {surumler.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">Önceki sürümler</h3>
                  <ul className="grid gap-3">
                    {surumler.map((s) => (
                      <li key={s.id} className="border-l-2 pl-3">
                        <b className="font-serif">{s.baslik}</b>
                        <p className="metin mt-1 text-muted-foreground">{s.aciklama}</p>
                        <Link href={`/karar/${s.surec_id}`} className="mt-1 inline-block text-xs underline underline-offset-2">
                          {new Date(s.bitis).toLocaleDateString("tr-TR")} tarihinde oylamayla değişti
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="mb-1 font-semibold">Uygunluk raporu (ontoloji) · {konu.uygunluk_puani}/100</h3>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {rapor.notlar.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </article>

        {/* Yan sütun: oylamalar, künye, işlemler */}
        <aside className="flex flex-col gap-8 lg:border-l lg:pl-8">
          <div className="flex flex-col gap-8">
            {(konu.durum === "oylamada" && kabulSureci) || suren.length > 0 ? (
              <section id="oylamalar" data-tur="oylamalar" className="flex scroll-mt-28 flex-col gap-6">
                {konu.durum === "oylamada" && kabulSureci && <OyKarti surecId={kabulSureci.id} ben={ben} />}
                {suren.map((k) =>
                  k.oylama ? (
                    <OyKarti key={k.id} surecId={k.id} ben={ben} baslik={k.baslik} />
                  ) : (
                    <p key={k.id} className="text-sm">
                      <Link href={`/karar/${k.id}`} className="font-serif font-semibold hover:underline">
                        {k.baslik}
                      </Link>{" "}
                      <span className="text-muted-foreground">— {k.asamaAd} aşamasında.</span>
                    </p>
                  ),
                )}
              </section>
            ) : null}

            <section>
              <div className="border-b border-foreground pb-1.5">
                <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase">Künye</h2>
              </div>
              <dl className="divide-y text-sm">
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Bölüm</dt>
                  <dd className="text-right">
                    <Link href={`/kategori/${kategori.id}`} className="hover:underline">
                      {kategori.ad}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Açılış</dt>
                  <dd>{tamTarih(konu.olusturma)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Katılımcılar</dt>
                  <dd>
                    <AvatarYigini adlar={katilimcilar.slice(0, 6)} fazla={Math.max(0, katilimcilar.length - 6)} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Bölüme uygunluk</dt>
                  <dd className="tabular-nums">{konu.uygunluk_puani}/100</dd>
                </div>
              </dl>
            </section>

            {tartismaVar && (
              <section className="flex flex-col gap-2" data-tur="islemler">
                <div className="border-b border-foreground pb-1.5">
                  <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase">Bu konuda</h2>
                </div>
                <div className="flex flex-col items-start gap-1 [&_button]:justify-start">
                  <YzOzetDiyalogu konuId={konu.id} ekleyebilir={!!ben && acik}>
                    <YzAnalizi a={tartismayiAnalizEt(konu.id)} acik={acik} />
                  </YzOzetDiyalogu>
                  {ben && acik && !benKurum && (
                    <>
                      <IslemDiyalogu
                        tetik={
                          <Button variant="ghost" size="sm">
                            <Handshake /> Uzlaşma öner
                          </Button>
                        }
                        baslik="Uzlaşma öner"
                        aciklama="Tartışmadan çıkan ortak görüşü yaz. Kabul edilirse konu bu uzlaşmayla kapanır. Aynı anda birden çok uzlaşma önerisi yarışabilir; ilgili üyelerin çoğunluğunu ilk alan kazanır."
                        islem={uzlasmaOnerisi}
                        gizli={{ konu_id: konu.id }}
                        alanlar={[{ ad: "metin", etiket: "Ortak görüş", tip: "uzun", zorunlu: true, satir: 5 }]}
                        dugme="Oylamaya sun"
                      />
                      <AltKonuDiyalogu ustKonuId={konu.id} ustBaslik={konu.baslik} />
                      {ben.id === konu.acan_id && (
                        <IslemDiyalogu
                          tetik={
                            <Button variant="ghost" size="sm">
                              <FileEdit /> Düzenleme öner
                            </Button>
                          }
                          baslik="Konu düzenlemesi öner"
                          aciklama="Konuyu sen açtığın için düzenleme önerebilirsin. Düzenleme, Topluluk Oylaması ve Yayın Kurulu’ndan geçerse uygulanır; eski hâli saklanır."
                          islem={konuDuzenlemeOnerisi}
                          gizli={{ konu_id: konu.id }}
                          alanlar={[
                            { ad: "baslik", etiket: "Yeni başlık", deger: konu.baslik, zorunlu: true },
                            { ad: "aciklama", etiket: "Yeni açıklama", tip: "uzun", deger: konu.aciklama, satir: 5 },
                            { ad: "gerekce", etiket: "Gerekçe", tip: "uzun", satir: 2 },
                          ]}
                          dugme="Oylamaya sun"
                        />
                      )}
                    </>
                  )}
                  {ben && !benKurum && konu.durum !== "silindi" && (
                    <IslemDiyalogu
                      tetik={
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <Trash2 /> Kaldırılmasını öner
                        </Button>
                      }
                      baslik="Konunun kaldırılmasını öner"
                      aciklama="Kabul edilirse (Topluluk Oylaması + Yayın Kurulu) konu listelerden kalkar; tartışma kaydı silinmez."
                      islem={konuSilmeOnerisi}
                      gizli={{ konu_id: konu.id }}
                      alanlar={[{ ad: "gerekce", etiket: "Gerekçe", tip: "uzun", zorunlu: true, satir: 3 }]}
                      dugme="Oylamaya sun"
                    />
                  )}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function AzinlikGorusleri({ konuId, ben }: { konuId: number; ben: { id: number } | null }) {
  const serhler = konuSerhleri(konuId);
  const yazabilir = !!ben && serhYazabilirMi(konuId, ben.id);
  if (!serhler.length && !yazabilir) return null;
  return (
    <section className="bg-muted/60 p-5">
      <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
        <MessageSquareQuote className="size-5 text-vurgu" /> Azınlık görüşleri
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Uzlaşmaya katılmayanların görüşleri de kalıcı olarak kayda geçer ve kurumlara iletilir.</p>
      <div className="mt-4 grid gap-4">
        {serhler.map((s) => (
          <blockquote key={s.id} className="border-l-[3px] border-vurgu pl-4">
            <p className="metin font-serif text-[17px] leading-relaxed italic">{s.icerik}</p>
            <footer className="mt-1 text-xs text-muted-foreground">
              — <KullaniciAdi ad={s.yazan} />, <Zaman iso={s.olusturma} />
            </footer>
          </blockquote>
        ))}
        {yazabilir && (
          <IslemDiyalogu
            tetik={
              <Button variant="outline" size="sm" className="justify-self-start">
                <MessageSquareQuote /> Azınlık görüşü ekle
              </Button>
            }
            baslik="Azınlık görüşü ekle"
            aciklama="Uzlaşmaya katılmıyorsan gerekçeni yaz; kalıcı olarak konunun altında görünür."
            islem={serhEkle}
            gizli={{ konu_id: konuId }}
            alanlar={[{ ad: "icerik", etiket: "Görüşün", tip: "uzun", zorunlu: true, satir: 4 }]}
            dugme="Ekle"
          />
        )}
      </div>
    </section>
  );
}
