import "server-only";
import { db } from "./db";
import { sayi } from "./bicim";
import { DEMO_TAKMA_ADLARI } from "./demoHesaplari";
import { kurumAdlari, tepkiBildir } from "./etki";
import { acikOylama, gorunenSayim, oyDurumu, oyKullan, oylamaGetir, secmenler, surecGetir, type Sayim } from "./oylama";

/*
 * CANLI GÖSTERİM (tanıtım turunun sonunda)
 * Süren bir uzlaşma oylaması gözün önünde sonuçlanır, ardından ilgili kurum resmî tepki bildirir.
 * Her şey gerçek iş kurallarıyla olur: oyları demo hesapları kullanır (kendi açtığın hesaplara dokunulmaz),
 * oylama eşik aşılınca kendiliğinden kapanır, konu uzlaşmayla kapanır, tepki Açık Arşiv’e yazılır.
 * Demo verisi `npm run demo` ile yenilenince gösterim yeniden yapılabilir.
 */

export type GosterimHedefi = {
  surecId: number;
  konuId: number;
  konuBaslik: string;
  uzlasma: string;
  kurumAd: string;
  baslangic: Sayim;
};

type Aday = { surecId: number; konuId: number; baslik: string; kategoriId: number };

function hedefBul(): (Aday & { kurumId: number; kurumTakma: string }) | null {
  const adaylar = db
    .prepare(
      `SELECT s.id AS surecId, k.id AS konuId, k.baslik, k.kategori_id AS kategoriId FROM surecler s
       JOIN konular k ON k.id = s.hedef_id
       WHERE s.tur = 'konu_kapat' AND s.durum = 'suruyor' AND s.asama = 'uyeler' AND k.durum = 'aktif'
       ORDER BY s.id`,
    )
    .all() as Aday[];
  const kurumlar = db.prepare("SELECT id, takma_ad FROM kullanicilar WHERE rol = 'resmi' ORDER BY id").all() as { id: number; takma_ad: string }[];
  if (!kurumlar.length) return null;

  for (const a of adaylar) {
    if (!acikOylama(a.surecId)) continue;
    // Önce tartışmaya resmî açıklama yazmış kurum, yoksa ilk kurum hesabı
    const yazan = db
      .prepare(
        `SELECT u.id, u.takma_ad FROM mesajlar m JOIN kullanicilar u ON u.id = m.yazan_id
         WHERE m.konu_id = ? AND u.rol = 'resmi' ORDER BY m.id DESC LIMIT 1`,
      )
      .get(a.konuId) as { id: number; takma_ad: string } | undefined;
    const kurum = yazan ?? kurumlar[0];
    return { ...a, kurumId: kurum.id, kurumTakma: kurum.takma_ad };
  }
  return null;
}

export function gosterimHedefi(): GosterimHedefi | null {
  const h = hedefBul();
  if (!h) return null;
  const s = surecGetir(h.surecId)!;
  return {
    surecId: h.surecId,
    konuId: h.konuId,
    konuBaslik: h.baslik,
    uzlasma: (JSON.parse(s.veri) as { metin: string }).metin,
    kurumAd: kurumAdlari().get(h.kurumTakma) ?? h.kurumTakma,
    baslangic: gorunenSayim(acikOylama(h.surecId)!),
  };
}

const kisalt = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

export function gosterimiOynat(surecId: number): { hata: string } | { bitis: Sayim; tepki: string; konuId: number } {
  const h = hedefBul();
  if (!h || h.surecId !== surecId) return { hata: "Bu oylama artık gösterime uygun değil." };
  const oylama = acikOylama(surecId)!;

  // Oy hakkı olan ve henüz oy vermemiş demo hesapları sırayla "evet" der; eşik aşılınca oylama kendiliğinden kapanır
  const demo = new Set(DEMO_TAKMA_ADLARI);
  const secmen = secmenler(oylama);
  const uyeler = db.prepare("SELECT id, takma_ad FROM kullanicilar").all() as { id: number; takma_ad: string }[];
  for (const u of uyeler) {
    if (oylamaGetir(oylama.id)!.durum !== "acik") break;
    if (!demo.has(u.takma_ad) || !secmen.has(u.id)) continue;
    if (oyDurumu(oylama, u.id).tur !== "oy_verebilir") continue;
    oyKullan(oylama.id, u.id, "evet");
  }
  const son = oylamaGetir(oylama.id)!;
  if (son.durum !== "kabul") return { hata: "Demo hesaplarının oyu bu oylamayı sonuçlandırmaya yetmedi." };

  const bitis = gorunenSayim(son);
  const metin = (JSON.parse(surecGetir(surecId)!.veri) as { metin: string }).metin;
  const tepki =
    `Ortak Akıl’da ${sayi(bitis.evet)} vatandaşın oyuyla kabul edilen “${kisalt(metin, 110)}” uzlaşmasını çalışma gündemimize aldık ` +
    `ve uygulamaya koyacağız. Bu amaçla bir çalışma grubu kuruldu; ilk adım olarak önümüzdeki dönemde pilot uygulama başlatılacak. ` +
    `Uygulamanın her aşamasını bu platformda kamuoyuyla paylaşacağız.`;
  const sonuc = tepkiBildir(h.konuId, h.kurumId, "gundemde", tepki);
  if ("hata" in sonuc) return { hata: sonuc.hata };
  return { bitis, tepki, konuId: h.konuId };
}
