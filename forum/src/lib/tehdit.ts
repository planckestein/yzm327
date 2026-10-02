/*
 * Tehdit denetimi — forumdaki TEK içerik kısıtlaması.
 *
 * ABD Anayasası 1. Değişiklik (First Amendment) ilkesi: hakaret dahil her ifade serbesttir;
 * yalnızca "gerçek tehdit" (true threat) koruma dışındadır (Virginia v. Black 2003, Counterman v. Colorado 2023).
 *
 * Yanlış alarmı azaltmak için bir ifade ancak şu durumda tehdit sayılır:
 *   (a) açık tehdit kalıbı ("seni bulacağım", "canına okuyacağım", "adresini biliyorum"…), veya
 *   (b) birinci tekil şahıs şiddet fiili ("öldürürüm", "keseceğim"…) + aynı cümlede bir hedef ("seni", "aileni"…).
 * Böylece "YZ insanlığı öldürür mü?" gibi tartışmalar engellenmez.
 */

const ACIK_KALIPLAR = [
  "seni bulaca",
  "seni bulur",
  "sizi bulaca",
  "canına okuy",
  "canına okur",
  "adresini biliyorum",
  "evini biliyorum",
  "sonun gelecek",
  "yaşamayacaksın",
  "gebertirim",
  "gebertece",
  "geberteca",
];

// Şiddet fiili kökleri + birinci tekil şahıs gelecek/geniş zaman ekleri
const FIIL =
  /(öldür|kes|vur|bıçakla|yak|döv|boğ|patlat|as|kır|parçala|sık)(ürüm|urum|irim|ırım|erim|arım|eceğim|acağım|ecem|acam|icem|ıcam|ucam|ücem)/u;
const HEDEF = /(^|\s)(seni|sizi|hepinizi|aileni|ailenizi|evini|kafanı|kafanızı|çocuğunu|anneni)(\s|$)/u;

function normallestir(metin: string) {
  return metin
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s.!?]/gu, " ")
    .replace(/\s+/g, " ");
}

/** Tehdit içeren cümleyi döndürür; yoksa null. */
export function tehditBul(metin: string): string | null {
  const n = normallestir(metin);
  for (const cumle of n.split(/[.!?\n]+/)) {
    const c = " " + cumle.trim() + " ";
    if (ACIK_KALIPLAR.some((k) => c.includes(k))) return cumle.trim();
    if (HEDEF.test(c) && c.split(" ").some((kelime) => FIIL.test(kelime))) return cumle.trim();
  }
  return null;
}

export const TEHDIT_MESAJI =
  "Bu ifade tehdit olarak algılandı. Ortak Akıl’da tehdit dışında her ifade serbesttir; lütfen tehdit içermeyecek şekilde yeniden yaz.";
