/*
 * Uygulamanın saati. Normalde gerçek zamandır; sadece demo verisi betiği (scripts/demo.ts)
 * geçmişte yaşanmış bir forumu canlandırmak için saati geri alır.
 */
let ofset = 0;

export function suan(): Date {
  return new Date(Date.now() + ofset);
}

export function suanIso(): string {
  return suan().toISOString();
}

export function gunSonra(gun: number): string {
  return new Date(suan().getTime() + gun * 86400_000).toISOString();
}

/** Yalnızca demo betiği için. */
export function saatiAyarla(tarih: Date) {
  ofset = tarih.getTime() - Date.now();
}
