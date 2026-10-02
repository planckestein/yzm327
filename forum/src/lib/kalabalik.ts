import { ozet32 } from "./bicim";

/*
 * GÖRÜNEN KALABALIK (demo sunumu için)
 *
 * Demo verisinde yaklaşık 20 üye var; gerçek bir kamuoyu platformunda ise binlerce kişi oy verir.
 * Arayüz, Topluluk Oylaması sayılarını her oylamaya özgü sabit bir çarpanla büyütüp gösterir.
 * Oylama mantığı (kabul/red, eşik, oy devri) HER ZAMAN gerçek sayılarla çalışır; burası yalnızca gösterimdir.
 * Oranlar korunur: gerçekte eşiğin altındaysa görünen sayı da eşiğin altında kalır.
 */

/** Tohuma göre 180–600 arası sabit çarpan */
export function carpan(tohum: string): number {
  return 180 + (ozet32(tohum) % 420);
}

/** n kişiyi, K çarpanı ve K/3'ten küçük sabit bir "gürültüyle" büyütür. */
export function buyut(n: number, K: number, tohum: string): number {
  if (n <= 0) return 0;
  return n * K + (ozet32(`${tohum}:${n}`) % Math.max(1, Math.floor(K / 3)));
}

/** Platformun toplam kayıtlı üyesi (söz alan vatandaş sayısından türetilir) */
export function toplamUye(vatandas: number): number {
  return buyut(vatandas, 2400, "uyeler");
}

/** Bir bölümün takipçi sayısı */
export function gorunenTakipci(kategoriId: number, gercek: number): number {
  return buyut(Math.max(1, gercek), carpan(`bolum${kategoriId}`) * 2, `t${kategoriId}`);
}

/** Konunun okunma sayısı: yanıt sayısıyla orantılı */
export function okunma(konuId: number, mesajSayisi: number): number {
  return buyut(mesajSayisi + 3, carpan(`konu${konuId}`) * 3, `ok${konuId}`);
}
