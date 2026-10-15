import { CIZGI, metinGenisligi, NotKutusu, notBoyu, OkUclari, ortaNokta, SOLUK, YAZI, yol, ZEMIN, ZeminliEtiket, type Nokta } from "./ortak";

/*
 * Sınıf (class) diyagramı. Kutular üç bölmelidir: ad, nitelikler, metotlar.
 *  tur      : varlik (veritabanı tablosu / TypeScript tipi), arayuz, sayim (enumeration), modul (TypeScript modülü),
 *             ozet (başka diyagramda ayrıntılı çizilen sınıf, yalnızca adı), dis (dış sistem)
 * İlişki uçları sınıfın bir kenarına bağlanır: [sınıf, kenar, kenar boyunca oran (0–1)].
 *  bilesim / toplama: elmas `a` (bütün) ucundadır · kalitim / gerceklestirme: üçgen `b` (genel olan) ucundadır
 */

type Kenar = "sol" | "sag" | "ust" | "alt";
type Uc = [string, Kenar, number?];

export type Sinif = {
  id: string;
  ad: string;
  x: number;
  y: number;
  en?: number;
  tur?: "varlik" | "arayuz" | "sayim" | "modul" | "ozet" | "dis";
  stereotip?: string;
  alt?: string;
  nitelikler?: string[];
  metotlar?: string[];
};

export type Iliski = {
  a: Uc;
  b: Uc;
  tur: "iliski" | "yonlu" | "kalitim" | "gerceklestirme" | "bilesim" | "toplama" | "bagimlilik";
  ad?: string;
  ac?: string;
  bc?: string;
  ara?: Nokta[];
  adKonum?: Nokta;
};

export type SinifNotu = { x: number; y: number; en: number; satirlar: string[]; bag?: Nokta };

export type SinifDiyagramiVerisi = { en: number; boy: number; siniflar: Sinif[]; iliskiler: Iliski[]; notlar?: SinifNotu[] };

const SATIR = 15;
const STEREOTIP: Partial<Record<NonNullable<Sinif["tur"]>, string>> = {
  arayuz: "interface",
  sayim: "enumeration",
  modul: "module",
  dis: "dış sistem",
};

const BASLIK_RENGI: Record<NonNullable<Sinif["tur"]>, string> = {
  varlik: "color-mix(in oklch, var(--sari) 24%, var(--card))",
  arayuz: "color-mix(in oklch, var(--civit) 16%, var(--card))",
  sayim: "color-mix(in oklch, var(--yasil) 16%, var(--card))",
  modul: "color-mix(in oklch, var(--gok) 20%, var(--card))",
  ozet: "var(--muted)",
  dis: "color-mix(in oklch, var(--kizil) 13%, var(--card))",
};

const stereotipYazisi = (s: Sinif) => {
  const st = s.stereotip ?? (s.tur ? STEREOTIP[s.tur] : undefined);
  return st ? `«${st}»` : null;
};

/** Kutunun ölçüleri ve bölme sınırları (yerleşim hesabı için dışarıya da açık). */
export function sinifOlcusu(s: Sinif) {
  const st = stereotipYazisi(s);
  const baslikBoy = (st ? 33 : 20) + (s.alt ? 14 : 0) + 8;
  const nitelikBoy = s.nitelikler ? s.nitelikler.length * SATIR + 8 : 0;
  const metotBoy = s.metotlar ? s.metotlar.length * SATIR + 8 : 0;
  const en =
    s.en ??
    Math.ceil(
      Math.max(
        metinGenisligi(s.ad, YAZI.ad, "kalin"),
        st ? metinGenisligi(st, YAZI.kucuk) : 0,
        s.alt ? metinGenisligi(s.alt, 10.5, "mono") : 0,
        ...(s.nitelikler ?? []).map((n) => metinGenisligi(n, YAZI.uye, "mono")),
        ...(s.metotlar ?? []).map((n) => metinGenisligi(n, YAZI.uye, "mono")),
      ) + 22,
    );
  return { en, boy: baslikBoy + nitelikBoy + metotBoy, baslikBoy, nitelikBoy, metotBoy };
}

function ucNoktasi(s: Sinif, kenar: Kenar, oran = 0.5): Nokta {
  const { en, boy } = sinifOlcusu(s);
  switch (kenar) {
    case "sol":
      return [s.x, s.y + boy * oran];
    case "sag":
      return [s.x + en, s.y + boy * oran];
    case "ust":
      return [s.x + en * oran, s.y];
    case "alt":
      return [s.x + en * oran, s.y + boy];
  }
}

const yatay = (k: Kenar) => k === "sol" || k === "sag";
const disari: Record<Kenar, Nokta> = { sol: [-1, 0], sag: [1, 0], ust: [0, -1], alt: [0, 1] };

/** Ara nokta verilmemişse dik açılı bir yol kurar. */
function otomatikYol(pa: Nokta, ka: Kenar, pb: Nokta, kb: Kenar): Nokta[] {
  if (ka === kb) {
    const [dx, dy] = disari[ka];
    const u = 26;
    const ea: Nokta = [pa[0] + dx * u, pa[1] + dy * u];
    const eb: Nokta = [pb[0] + dx * u, pb[1] + dy * u];
    const ortak: Nokta = yatay(ka) ? [dx > 0 ? Math.max(ea[0], eb[0]) : Math.min(ea[0], eb[0]), 0] : [0, dy > 0 ? Math.max(ea[1], eb[1]) : Math.min(ea[1], eb[1])];
    return yatay(ka) ? [pa, [ortak[0], pa[1]], [ortak[0], pb[1]], pb] : [pa, [pa[0], ortak[1]], [pb[0], ortak[1]], pb];
  }
  if (yatay(ka) && yatay(kb)) {
    if (Math.abs(pa[1] - pb[1]) < 1) return [pa, pb];
    const mx = (pa[0] + pb[0]) / 2;
    return [pa, [mx, pa[1]], [mx, pb[1]], pb];
  }
  if (!yatay(ka) && !yatay(kb)) {
    if (Math.abs(pa[0] - pb[0]) < 1) return [pa, pb];
    const my = (pa[1] + pb[1]) / 2;
    return [pa, [pa[0], my], [pb[0], my], pb];
  }
  return yatay(ka) ? [pa, [pb[0], pa[1]], pb] : [pa, [pa[0], pb[1]], pb];
}

/** Uç yazısı (çokluk): yatay çıkışta çizginin üstüne, dikey çıkışta sağına. */
function UcYazisi({ p, kenar, metin }: { p: Nokta; kenar: Kenar; metin: string }) {
  const [dx, dy] = disari[kenar];
  if (yatay(kenar))
    return (
      <text x={p[0] + dx * 6} y={p[1] - 5} fontSize={YAZI.kucuk} textAnchor={dx > 0 ? "start" : "end"} fill={CIZGI}>
        {metin}
      </text>
    );
  return (
    <text x={p[0] + 5} y={p[1] + dy * 6 + (dy > 0 ? 9 : -1)} fontSize={YAZI.kucuk} fill={CIZGI}>
      {metin}
    </text>
  );
}

function SinifKutusu({ s }: { s: Sinif }) {
  const { en, boy, baslikBoy, nitelikBoy } = sinifOlcusu(s);
  const st = stereotipYazisi(s);
  const orta = s.x + en / 2;
  const adY = s.y + (st ? 33 : 20);
  return (
    <g>
      <rect x={s.x} y={s.y} width={en} height={boy} fill={ZEMIN} stroke={CIZGI} strokeWidth={1.2} strokeDasharray={s.tur === "dis" ? "5 3" : undefined} />
      <rect x={s.x + 0.6} y={s.y + 0.6} width={en - 1.2} height={baslikBoy - 1.2} style={{ fill: BASLIK_RENGI[s.tur ?? "varlik"] }} />
      {st && (
        <text x={orta} y={s.y + 17} textAnchor="middle" fontSize={YAZI.kucuk} fill={SOLUK}>
          {st}
        </text>
      )}
      <text x={orta} y={adY} textAnchor="middle" fontSize={YAZI.ad} fontWeight={650} fill={CIZGI}>
        {s.ad}
      </text>
      {s.alt && (
        <text x={orta} y={adY + 14} textAnchor="middle" fontSize={10.5} fontFamily="var(--font-mono)" fill={SOLUK}>
          {s.alt}
        </text>
      )}
      {s.nitelikler && <path d={`M${s.x} ${s.y + baslikBoy}h${en}`} stroke={CIZGI} strokeWidth={1} />}
      {s.nitelikler?.map((n, i) => (
        <text key={i} x={s.x + 9} y={s.y + baslikBoy + 4 + SATIR * (i + 1) - 3} fontSize={YAZI.uye} fontFamily="var(--font-mono)" fill={CIZGI}>
          {n}
        </text>
      ))}
      {s.metotlar && <path d={`M${s.x} ${s.y + baslikBoy + nitelikBoy}h${en}`} stroke={CIZGI} strokeWidth={1} />}
      {s.metotlar?.map((n, i) => (
        <text
          key={i}
          x={s.x + 9}
          y={s.y + baslikBoy + nitelikBoy + 4 + SATIR * (i + 1) - 3}
          fontSize={YAZI.uye}
          fontFamily="var(--font-mono)"
          fill={CIZGI}
        >
          {n}
        </text>
      ))}
    </g>
  );
}

export function SinifDiyagrami({ veri, on, baslik }: { veri: SinifDiyagramiVerisi; on: string; baslik: string }) {
  const siniflar = new Map(veri.siniflar.map((s) => [s.id, s]));
  const sinif = (id: string) => {
    const s = siniflar.get(id);
    if (!s) throw new Error(`Sınıf diyagramında bilinmeyen sınıf: ${id}`);
    return s;
  };
  return (
    <svg viewBox={`0 0 ${veri.en} ${veri.boy}`} width={veri.en} className="uml" role="img" aria-label={baslik} fontFamily="var(--font-sans)">
      <OkUclari on={on} />
      {veri.notlar?.map((n, i) =>
        n.bag ? (
          <path key={i} d={yol([[n.x + n.en / 2, n.y + notBoyu(n.satirlar.length) / 2], n.bag])} stroke={SOLUK} strokeDasharray="3 3" fill="none" />
        ) : null,
      )}
      {veri.iliskiler.map((r, i) => {
        const pa = ucNoktasi(sinif(r.a[0]), r.a[1], r.a[2]);
        const pb = ucNoktasi(sinif(r.b[0]), r.b[1], r.b[2]);
        const noktalar = r.ara ? [pa, ...r.ara, pb] : otomatikYol(pa, r.a[1], pb, r.b[1]);
        const kesikli = r.tur === "gerceklestirme" || r.tur === "bagimlilik";
        const bas = r.tur === "bilesim" ? "elmas" : r.tur === "toplama" ? "elmasBos" : null;
        const son = r.tur === "kalitim" || r.tur === "gerceklestirme" ? "ucgen" : r.tur === "bagimlilik" || r.tur === "yonlu" ? "acik" : null;
        const [ex, ey] = r.adKonum ?? ortaNokta(noktalar);
        return (
          <g key={i}>
            <path
              d={yol(noktalar)}
              fill="none"
              stroke={CIZGI}
              strokeWidth={1.1}
              strokeDasharray={kesikli ? "5 4" : undefined}
              markerStart={bas ? `url(#${on}-${bas})` : undefined}
              markerEnd={son ? `url(#${on}-${son})` : undefined}
            />
            {r.ac && <UcYazisi p={pa} kenar={r.a[1]} metin={r.ac} />}
            {r.bc && <UcYazisi p={pb} kenar={r.b[1]} metin={r.bc} />}
            {r.ad && <ZeminliEtiket x={ex} y={ey + 4} metin={r.ad} italik={r.ad.startsWith("«")} />}
          </g>
        );
      })}
      {veri.siniflar.map((s) => (
        <SinifKutusu key={s.id} s={s} />
      ))}
      {veri.notlar?.map((n, i) => (
        <NotKutusu key={i} x={n.x} y={n.y} en={n.en} satirlar={n.satirlar} />
      ))}
    </svg>
  );
}
