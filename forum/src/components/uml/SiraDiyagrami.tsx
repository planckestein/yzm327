import { CIZGI, metinGenisligi, NotKutusu, notBoyu, OkUclari, SOLUK, YAZI, ZEMIN } from "./ortak";

/*
 * Sıralama (sequence) diyagramı. Adımlar yukarıdan aşağı sırayla yazılır, yerleşim otomatik hesaplanır:
 *  m       : eşzamanlı çağrı (dolu ok). Hedefte bir etkinlik çubuğu açılır; `kisa` ise çubuk hemen kapanır.
 *  d       : dönüş (kesikli ok). Gönderenin açık çubuğunu kapatır; `dal` ise (alt/break içindeki erken dönüş)
 *            çubuk açık kalır, çünkü öteki kolda iş sürer.
 *  k       : nesnenin kendi fonksiyonunu çağırması (kendine dönen ok)
 * Uzun etiketler "\n" ile satırlara bölünür; her satır ayrı ölçülür (kod satırı eşaralıklı, düz yazı orantılı).
 *  cerceve : etkileşim çerçevesi (alt, opt, loop, break) · baska: alt'ın bir sonraki kolu · son: çerçeve biter
 *  not     : bir ya da iki yaşam çizgisinin üstüne not
 */

export type Katilimci = { id: string; ad: string; alt?: string; tur?: "aktor" | "kutu" | "vt" | "dis" };

export type Adim =
  | { m: [string, string]; e: string; kisa?: boolean }
  | { d: [string, string]; e?: string; dal?: boolean }
  | { k: string; e: string }
  | { cerceve: "alt" | "opt" | "loop" | "break" | "par"; kosul: string }
  | { baska: string }
  | { son: true }
  | { not: string | [string, string]; e: string[] };

export type SiraDiyagramiVerisi = { katilimcilar: Katilimci[]; adimlar: Adim[] };

const ETIKET = 11;
/** Fonksiyon çağrısı ya da SQL ise eşaralıklı yazılır: "oyKullan(…)", "INSERT oylar" */
const kodMu = (s: string) => /[\w\]]\(/.test(s) || /^(INSERT|UPDATE|SELECT|DELETE|BEGIN|COMMIT|POST)\b/.test(s);
const satirGenisligi = (s: string) => metinGenisligi(s, ETIKET, kodMu(s) ? "mono" : "sans");
const genislik = (e: string) => Math.max(...e.split("\n").map(satirGenisligi));
const notGenisligi = (satirlar: string[]) => Math.max(...satirlar.map((s) => metinGenisligi(s, YAZI.kucuk))) + 16;

const kutuEni = (k: Katilimci) =>
  k.tur === "aktor"
    ? Math.max(64, metinGenisligi(k.ad, 12.5, "kalin") + 8)
    : Math.max(88, metinGenisligi(k.ad, 12.5, "kalin") + 24, k.alt ? metinGenisligi(k.alt, 10.5) + 20 : 0);
const kutuBoyu = (k: Katilimci) => (k.tur === "aktor" ? 72 : k.tur === "vt" ? 50 : k.alt ? 42 : 30);

type Cubuk = { i: number; y1: number; y2: number; d: number };
type Ok = { x1: number; x2: number; y: number; etiket: string[]; donus: boolean };
/** Kendine çağrı: `x` okun çıktığı çubuk kenarı, `ic` dönüşün girdiği iç çubuğun kenarı */
type Kendi = { x: number; ic: number; y: number; etiket: string };
type Cerceve = { tur: string; kosul: string; y1: number; y2: number; sol: number; sag: number; ayraclar: { y: number; kosul: string }[] };
type Not = { x: number; y: number; en: number; satirlar: string[] };

function yerlesim(v: SiraDiyagramiVerisi) {
  const K = v.katilimcilar;
  const sira = new Map(K.map((k, i) => [k.id, i]));
  const no = (id: string) => {
    const i = sira.get(id);
    if (i === undefined) throw new Error(`Sıralama diyagramında bilinmeyen katılımcı: ${id}`);
    return i;
  };
  const en = K.map(kutuEni);

  // Yatay: komşu kutular sığsın, her mesajın etiketi iki yaşam çizgisinin arasına sığsın
  const ara = K.slice(1).map((_, i) => (en[i] + en[i + 1]) / 2 + 18);
  const kisitlar: [number, number, number][] = [];
  let sagTasma = 0;
  for (const a of v.adimlar) {
    if ("m" in a || "d" in a) {
      const [p, q] = ("m" in a ? a.m : a.d).map(no);
      if (p !== q) kisitlar.push([Math.min(p, q), Math.max(p, q), (a.e ? genislik(a.e) : 0) + 30]);
    } else if ("k" in a) {
      const i = no(a.k);
      const w = genislik(a.e) + 26;
      if (i < K.length - 1) kisitlar.push([i, i + 1, w]);
      else sagTasma = Math.max(sagTasma, w);
    } else if ("not" in a && typeof a.not === "string" && no(a.not) === K.length - 1) sagTasma = Math.max(sagTasma, notGenisligi(a.e) + 14);
  }
  for (let tur = 0; tur < 60; tur++) {
    let degisti = false;
    for (const [p, q, w] of kisitlar) {
      const mevcut = ara.slice(p, q).reduce((t, g) => t + g, 0);
      if (mevcut + 0.5 < w) {
        const pay = (w - mevcut) / (q - p);
        for (let i = p; i < q; i++) ara[i] += pay;
        degisti = true;
      }
    }
    if (!degisti) break;
  }
  const x = [16 + en[0] / 2];
  ara.forEach((g, i) => x.push(x[i] + g));

  // Dikey
  const H0 = 10 + Math.max(...K.map(kutuBoyu));
  let y = H0 + 20;
  const acik: number[][] = K.map(() => []);
  const cubuklar: Cubuk[] = [];
  const oklar: Ok[] = [];
  const kendiler: Kendi[] = [];
  const notlar: Not[] = [];
  const cerceveler: Cerceve[] = [];
  const yigin: Cerceve[] = [];
  const aktorMu = (i: number) => K[i].tur === "aktor";
  const kenar = (i: number, sag: boolean, d = acik[i].length) => {
    if (!d || aktorMu(i)) return x[i];
    const sol = x[i] - 5 + (d - 1) * 5;
    return sag ? sol + 10 : sol;
  };
  const kapsa = (x1: number, x2: number) => {
    const f = yigin.at(-1);
    if (!f) return;
    f.sol = Math.min(f.sol, x1, x2);
    f.sag = Math.max(f.sag, x1, x2);
  };

  for (const a of v.adimlar) {
    if ("m" in a) {
      const [p, q] = a.m.map(no);
      const satirlar = a.e.split("\n");
      const oy = y + satirlar.length * 13 + 2;
      const saga = q > p;
      const x1 = kenar(p, saga);
      let x2: number;
      if (a.kisa || aktorMu(q)) {
        const d = acik[q].length + 1;
        x2 = kenar(q, !saga, d);
        if (!aktorMu(q)) cubuklar.push({ i: q, y1: oy - 3, y2: oy + 13, d });
      } else {
        acik[q].push(oy - 3);
        x2 = kenar(q, !saga);
      }
      oklar.push({ x1, x2, y: oy, etiket: satirlar, donus: false });
      kapsa(x1, x2);
      y = oy + 13;
    } else if ("d" in a) {
      const [p, q] = a.d.map(no);
      const satirlar = a.e ? a.e.split("\n") : [];
      const oy = y + satirlar.length * 13 + 2;
      const saga = q > p;
      const x1 = kenar(p, saga);
      const bas = a.dal ? undefined : acik[p].pop();
      if (bas !== undefined) cubuklar.push({ i: p, y1: bas, y2: oy + 3, d: acik[p].length + 1 });
      const x2 = kenar(q, !saga);
      oklar.push({ x1, x2, y: oy, etiket: satirlar, donus: true });
      kapsa(x1, x2);
      y = oy + 13;
    } else if ("k" in a) {
      const i = no(a.k);
      const oy = y + 15 + (a.e.split("\n").length - 1) * 13;
      const xs = kenar(i, true);
      const d = acik[i].length + 1;
      const ic = kenar(i, true, d);
      kendiler.push({ x: xs, ic, y: oy, etiket: a.e });
      cubuklar.push({ i, y1: oy + 9, y2: oy + 25, d });
      kapsa(x[i] - 8, Math.max(ic + 30, xs + genislik(a.e) + 6));
      y = oy + 30;
    } else if ("cerceve" in a) {
      const f: Cerceve = { tur: a.cerceve, kosul: a.kosul, y1: y + 2, y2: 0, sol: Infinity, sag: -Infinity, ayraclar: [] };
      yigin.push(f);
      y += 28;
    } else if ("baska" in a) {
      yigin.at(-1)!.ayraclar.push({ y: y + 2, kosul: a.baska });
      y += 26;
    } else if ("son" in a) {
      const f = yigin.pop()!;
      f.y2 = y + 4;
      if (f.sol === Infinity) [f.sol, f.sag] = [x[0], x[0] + 120];
      f.sol -= 16;
      f.sag += 16;
      const enAz = metinGenisligi(f.tur, ETIKET, "kalin") + 26 + metinGenisligi(`[${f.kosul}]`, ETIKET) + 12;
      const ayracEn = Math.max(0, ...f.ayraclar.map((s) => metinGenisligi(`[${s.kosul}]`, ETIKET) + 20));
      f.sag = Math.max(f.sag, f.sol + enAz, f.sol + ayracEn);
      cerceveler.push(f);
      kapsa(f.sol, f.sag);
      y += 14;
    } else if ("not" in a) {
      const n = notGenisligi(a.e);
      let nx: number;
      let nen = n;
      if (typeof a.not === "string") nx = kenar(no(a.not), true) + 8;
      else {
        const [p, q] = a.not.map(no).sort((m, n2) => m - n2);
        nen = Math.max(n, x[q] - x[p] + 40);
        nx = (x[p] + x[q]) / 2 - nen / 2;
      }
      notlar.push({ x: nx, y: y + 4, en: nen, satirlar: a.e });
      kapsa(nx, nx + nen);
      y += notBoyu(a.e.length) + 12;
    }
  }
  const bitis = y + 10;
  K.forEach((_, i) => {
    while (acik[i].length) cubuklar.push({ i, y1: acik[i].pop()!, y2: bitis - 4, d: acik[i].length + 1 });
  });
  const tumGenislik = Math.max(
    x.at(-1)! + en.at(-1)! / 2 + 16 + sagTasma,
    ...cerceveler.map((f) => f.sag + 8),
    ...notlar.map((n) => n.x + n.en + 8),
  );
  const sol = Math.min(0, ...cerceveler.map((f) => f.sol - 8), ...notlar.map((n) => n.x - 8));
  return { x, en, H0, bitis, cubuklar, oklar, kendiler, notlar, cerceveler, sol, genislik: tumGenislik - sol, boy: bitis + 12 };
}

function Baslik({ k, x, H0 }: { k: Katilimci; x: number; H0: number }) {
  const en = kutuEni(k);
  const boy = kutuBoyu(k);
  const ust = H0 - boy;
  if (k.tur === "aktor") {
    const y = ust + 36;
    return (
      <g stroke={CIZGI} strokeWidth={1.5} fill="none" strokeLinecap="round">
        <circle cx={x} cy={y - 26} r={7.5} fill={ZEMIN} />
        <path d={`M${x} ${y - 18}V${y + 4}M${x - 14} ${y - 11}H${x + 14}M${x} ${y + 4}L${x - 11} ${y + 22}M${x} ${y + 4}L${x + 11} ${y + 22}`} />
        <text x={x} y={H0 - 3} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={CIZGI} stroke="none">
          {k.ad}
        </text>
      </g>
    );
  }
  if (k.tur === "vt") {
    const ry = 6;
    return (
      <g>
        <path
          d={`M${x - en / 2} ${ust + ry}V${H0 - ry}A${en / 2} ${ry} 0 0 0 ${x + en / 2} ${H0 - ry}V${ust + ry}`}
          fill={ZEMIN}
          stroke={CIZGI}
          strokeWidth={1.2}
        />
        <ellipse cx={x} cy={ust + ry} rx={en / 2} ry={ry} style={{ fill: "color-mix(in oklch, var(--gok) 20%, var(--card))" }} stroke={CIZGI} strokeWidth={1.2} />
        <text x={x} y={ust + 30} textAnchor="middle" fontSize={12.5} fontWeight={650} fill={CIZGI}>
          {k.ad}
        </text>
        {k.alt && (
          <text x={x} y={ust + 43} textAnchor="middle" fontSize={10.5} fill={SOLUK}>
            {k.alt}
          </text>
        )}
      </g>
    );
  }
  return (
    <g>
      <rect
        x={x - en / 2}
        y={ust}
        width={en}
        height={boy}
        style={{ fill: k.tur === "dis" ? "color-mix(in oklch, var(--kizil) 12%, var(--card))" : "color-mix(in oklch, var(--sari) 22%, var(--card))" }}
        stroke={CIZGI}
        strokeWidth={1.2}
        strokeDasharray={k.tur === "dis" ? "5 3" : undefined}
      />
      <text x={x} y={ust + 19} textAnchor="middle" fontSize={12.5} fontWeight={650} fill={CIZGI} fontFamily={kodMu(k.ad) || k.ad.endsWith(".ts") ? "var(--font-mono)" : undefined}>
        {k.ad}
      </text>
      {k.alt && (
        <text x={x} y={ust + 34} textAnchor="middle" fontSize={10.5} fill={SOLUK}>
          {k.alt}
        </text>
      )}
    </g>
  );
}

function EtiketSatiri({ x, y, metin, anchor = "middle", italik }: { x: number; y: number; metin: string; anchor?: "middle" | "start"; italik?: boolean }) {
  const kod = kodMu(metin);
  const w = satirGenisligi(metin) + 6;
  const sol = anchor === "middle" ? x - w / 2 : x - 3;
  return (
    <g>
      <rect x={sol} y={y - 10} width={w} height={13} fill={ZEMIN} />
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontSize={ETIKET}
        fontFamily={kod ? "var(--font-mono)" : undefined}
        fontStyle={italik && !kod ? "italic" : undefined}
        fill={CIZGI}
      >
        {metin}
      </text>
    </g>
  );
}

export function SiraDiyagrami({ veri, on, baslik }: { veri: SiraDiyagramiVerisi; on: string; baslik: string }) {
  const l = yerlesim(veri);
  return (
    <svg viewBox={`${l.sol} 0 ${l.genislik} ${l.boy}`} width={l.genislik} className="uml" role="img" aria-label={baslik} fontFamily="var(--font-sans)">
      <OkUclari on={on} />

      {l.cerceveler.map((f, i) => (
        <rect key={`c${i}`} x={f.sol} y={f.y1} width={f.sag - f.sol} height={f.y2 - f.y1} fill="none" stroke={CIZGI} strokeWidth={1} />
      ))}

      {veri.katilimcilar.map((k, i) => (
        <path key={`y${i}`} d={`M${l.x[i]} ${l.H0}V${l.bitis}`} stroke={SOLUK} strokeWidth={1} strokeDasharray="5 4" />
      ))}

      {l.cubuklar.map((c, i) => (
        <rect
          key={`a${i}`}
          x={l.x[c.i] - 5 + (c.d - 1) * 5}
          y={c.y1}
          width={10}
          height={Math.max(8, c.y2 - c.y1)}
          style={{ fill: "color-mix(in oklch, var(--gok) 16%, var(--card))" }}
          stroke={CIZGI}
          strokeWidth={1}
        />
      ))}

      {l.oklar.map((o, i) => (
        <g key={`o${i}`}>
          <path
            d={`M${o.x1} ${o.y}H${o.x2}`}
            stroke={CIZGI}
            strokeWidth={1.1}
            strokeDasharray={o.donus ? "5 4" : undefined}
            markerEnd={`url(#${on}-${o.donus ? "acik" : "dolu"})`}
          />
          {o.etiket.map((s, j) => (
            <EtiketSatiri key={j} x={(o.x1 + o.x2) / 2} y={o.y - 5 - (o.etiket.length - 1 - j) * 13} metin={s} italik={o.donus} />
          ))}
        </g>
      ))}

      {l.kendiler.map((k, i) => (
        <g key={`k${i}`}>
          <path d={`M${k.x} ${k.y}H${k.ic + 24}V${k.y + 14}H${k.ic}`} fill="none" stroke={CIZGI} strokeWidth={1.1} markerEnd={`url(#${on}-dolu)`} />
          {k.etiket.split("\n").map((s, j, t) => (
            <EtiketSatiri key={j} x={k.x + 5} y={k.y - 5 - (t.length - 1 - j) * 13} metin={s} anchor="start" />
          ))}
        </g>
      ))}

      {l.cerceveler.map((f, i) => {
        const w = metinGenisligi(f.tur, ETIKET, "kalin") + 16;
        return (
          <g key={`t${i}`}>
            <path d={`M${f.sol} ${f.y1}H${f.sol + w}V${f.y1 + 11}L${f.sol + w - 6} ${f.y1 + 18}H${f.sol}z`} fill={ZEMIN} stroke={CIZGI} strokeWidth={1} />
            <text x={f.sol + 6} y={f.y1 + 13} fontSize={ETIKET} fontWeight={700} fill={CIZGI}>
              {f.tur}
            </text>
            <rect x={f.sol + w + 4} y={f.y1 + 3} width={metinGenisligi(`[${f.kosul}]`, ETIKET) + 8} height={13} fill={ZEMIN} />
            <text x={f.sol + w + 8} y={f.y1 + 13} fontSize={ETIKET} fontStyle="italic" fill={CIZGI}>
              [{f.kosul}]
            </text>
            {f.ayraclar.map((a, j) => (
              <g key={j}>
                <path d={`M${f.sol} ${a.y}H${f.sag}`} stroke={CIZGI} strokeWidth={1} strokeDasharray="6 4" />
                <rect x={f.sol + 4} y={a.y + 4} width={metinGenisligi(`[${a.kosul}]`, ETIKET) + 8} height={13} fill={ZEMIN} />
                <text x={f.sol + 8} y={a.y + 14} fontSize={ETIKET} fontStyle="italic" fill={CIZGI}>
                  [{a.kosul}]
                </text>
              </g>
            ))}
          </g>
        );
      })}

      {l.notlar.map((n, i) => (
        <NotKutusu key={`n${i}`} x={n.x} y={n.y} en={n.en} satirlar={n.satirlar} />
      ))}

      {veri.katilimcilar.map((k, i) => (
        <Baslik key={`b${i}`} k={k} x={l.x[i]} H0={l.H0} />
      ))}
    </svg>
  );
}
