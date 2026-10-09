/*
 * KURULTAY BAŞLATICI — masaüstündeki Kurultay simgesi bunu çalıştırır (Kurultay.cmd üzerinden).
 *
 * Sırasıyla: paketler yoksa kurar → kaynak değiştiyse derler → veritabanı boşsa demo verisini kurar →
 * sunucuyu açar (aynı Wi-Fi'daki telefonlar için 0.0.0.0) → ücretsiz Cloudflare tüneliyle telefona
 * HTTPS adres açar → Kurultay'ı tarayıcı çubuğu olmayan kendi penceresinde açar.
 * Sunucu zaten çalışıyorsa yalnızca pencereyi açar. Bu konsol penceresi kapanınca Kurultay da kapanır.
 *
 * Seçenekler:  --demo       demo verisini baştan kurar (kendi hesapların korunur)
 *              --derle      kaynak değişmemiş olsa da yeniden derler
 *              --tunelsiz   telefon tünelini açmaz (yalnızca aynı Wi-Fi)
 *              --pencere-yok  uygulama penceresini açmaz
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 3000);
const ADRES = `http://localhost:${PORT}`;
const ARACLAR = path.join(KOK, ".araclar");
const VERI = path.join(KOK, "veri");
const TUNEL_DOSYASI = path.join(VERI, "tunel.json");
const CLOUDFLARED = path.join(ARACLAR, "cloudflared.exe");
const CLOUDFLARED_ADRESI = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";
const secenek = new Set(process.argv.slice(2));
const cocuklar = [];

const adim = (m) => console.log(`\n  ◆ ${m}`);
const bilgi = (m) => console.log(`    ${m}`);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/** npm komutunu bu konsolda çalıştırır; Windows'ta npm bir .cmd olduğu için kabuk gerekir. */
function npm(...arg) {
  const r = spawnSync(`npm ${arg.join(" ")}`, { cwd: KOK, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error(`npm ${arg.join(" ")} başarısız oldu`);
}

async function kurultayCalisiyorMu() {
  try {
    const r = await fetch(`${ADRES}/manifest.webmanifest`, { signal: AbortSignal.timeout(1500) });
    return r.ok && (await r.json()).name === "Kurultay";
  } catch {
    return false;
  }
}

/** Kapıda hiçbir program dinlemiyor mu? (Bağlantı reddedildiyse boştur.) */
async function portBosMu() {
  try {
    await fetch(ADRES, { signal: AbortSignal.timeout(1500) });
    return false;
  } catch (e) {
    return e?.cause?.code === "ECONNREFUSED";
  }
}

/** Bir klasördeki en yeni dosyanın değişme zamanı (derleme gerekip gerekmediğini anlamak için). */
function enYeni(yol) {
  if (!fs.existsSync(yol)) return 0;
  const st = fs.statSync(yol);
  if (!st.isDirectory()) return st.mtimeMs;
  return fs.readdirSync(yol).reduce((en, ad) => Math.max(en, enYeni(path.join(yol, ad))), st.mtimeMs);
}

function derlemeGerekiyor() {
  const id = path.join(KOK, ".next", "BUILD_ID");
  if (!fs.existsSync(id)) return true;
  const kaynak = Math.max(...["src", "public", "package.json", "package-lock.json", "next.config.ts"].map((p) => enYeni(path.join(KOK, p))));
  return kaynak > fs.statSync(id).mtimeMs;
}

async function veritabaniBosMu() {
  const dosya = path.join(VERI, "forum.db");
  if (!fs.existsSync(dosya)) return true;
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dosya, { readOnly: true });
    const n = db.prepare("SELECT COUNT(*) AS n FROM konular").get().n;
    db.close();
    return n === 0;
  } catch {
    return true;
  }
}

/** Açılış ekranı: sunucu hazırlanırken pencere hemen açılır, hazır olunca Kurultay'a geçer. */
function pencereAc(adres) {
  if (secenek.has("--pencere-yok")) return;
  const edge = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].find((p) => fs.existsSync(p));
  if (edge) spawn(edge, [`--app=${adres}`, "--window-size=1280,860"], { detached: true, stdio: "ignore" }).unref();
  else spawn("cmd", ["/c", "start", "", adres], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

async function sunucuyuAc() {
  const next = path.join(KOK, "node_modules", "next", "dist", "bin", "next");
  const sunucu = spawn(process.execPath, [next, "start", "-H", "0.0.0.0", "-p", String(PORT)], {
    cwd: KOK,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  cocuklar.push(sunucu);
  const gunluk = fs.createWriteStream(path.join(VERI, "sunucu.log"), { flags: "a" });
  sunucu.stdout.pipe(gunluk);
  sunucu.stderr.pipe(gunluk);
  sunucu.on("exit", (kod) => {
    if (kod) console.log(`\n  Sunucu kapandı (kod ${kod}). Ayrıntı: forum/veri/sunucu.log`);
  });
  for (let i = 0; i < 120; i++) {
    if (await kurultayCalisiyorMu()) return true;
    await bekle(500);
  }
  return false;
}

/**
 * İndirilen dosya tam ve gerçekten Cloudflare'ın mı? Windows'un imza doğrulaması: yarım inen ya da
 * değiştirilmiş dosyada imza tutmaz (yarım dosya `--version`'a yine de yanıt verebildiği için o yetmez).
 */
function cloudflaredSaglamMi(dosya) {
  const ps = `$i = Get-AuthenticodeSignature -LiteralPath '${dosya.replace(/'/g, "''")}'; if ($i.Status -eq 'Valid' -and $i.SignerCertificate.Subject -like '*Cloudflare*') { 'saglam' }`;
  const r = spawnSync("powershell", ["-NoProfile", "-EncodedCommand", Buffer.from(ps, "utf16le").toString("base64")], { encoding: "utf8", windowsHide: true });
  return r.stdout.includes("saglam");
}

/**
 * Tünel aracını arka planda indirir. Windows'un kendi curl'ü kullanılır: bağlantı koparsa yeniden dener,
 * pencere kapanırsa bir sonraki açılışta kaldığı yerden sürer. Bitince `bitince` çağrılır.
 */
function tunelAraciniIndir(bitince) {
  fs.mkdirSync(ARACLAR, { recursive: true });
  const gecici = `${CLOUDFLARED}.indiriliyor`;
  const curl = path.join(process.env.SystemRoot ?? "C:/Windows", "System32", "curl.exe");
  const indir = spawn(curl, ["-L", "--retry", "5", "--retry-all-errors", "-C", "-", "-sS", "-o", gecici, CLOUDFLARED_ADRESI], {
    stdio: "ignore",
    windowsHide: true,
  });
  cocuklar.push(indir);
  indir.on("exit", () => {
    // curl'ün çıkış koduna güvenilmez (dosya zaten tamsa "aralık yok" hatası verebilir); dosyanın imzasına bakılır
    if (!fs.existsSync(gecici)) return bilgi("Tünel aracı indirilemedi; bir sonraki açılışta yeniden denenecek.");
    fs.renameSync(gecici, CLOUDFLARED);
    if (cloudflaredSaglamMi(CLOUDFLARED)) return bitince();
    fs.renameSync(CLOUDFLARED, gecici);
    bilgi("Tünel aracı yarım indi; bir sonraki açılışta kaldığı yerden sürecek. Telefon şimdilik aynı Wi-Fi'dan bağlanabilir.");
  });
}

/** Ücretsiz, hesapsız Cloudflare "quick tunnel": https://<rastgele>.trycloudflare.com → bu bilgisayar. */
function tunelBaslat() {
  const tunel = spawn(CLOUDFLARED, ["tunnel", "--url", ADRES, "--no-autoupdate"], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  cocuklar.push(tunel);
  return new Promise((coz) => {
    const sure = setTimeout(() => coz(null), 40_000);
    const oku = (parca) => {
      const m = String(parca).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (!m) return;
      clearTimeout(sure);
      fs.writeFileSync(TUNEL_DOSYASI, JSON.stringify({ adres: m[0], zaman: new Date().toISOString() }));
      coz(m[0]);
    };
    tunel.stdout.on("data", oku);
    tunel.stderr.on("data", oku);
    tunel.on("exit", () => coz(null));
  });
}

/** Tünel aracı varsa tüneli açar; yoksa arka planda indirir ve inince açar (Kurultay bu sırada kullanılabilir). */
async function tuneliAc() {
  fs.rmSync(TUNEL_DOSYASI, { force: true });
  if (secenek.has("--tunelsiz")) return null;
  if (fs.existsSync(CLOUDFLARED) && cloudflaredSaglamMi(CLOUDFLARED)) return tunelBaslat();
  if (fs.existsSync(CLOUDFLARED)) fs.renameSync(CLOUDFLARED, `${CLOUDFLARED}.indiriliyor`); // bozuksa kaldığı yerden tamamlansın
  bilgi("Tünel aracı (ücretsiz Cloudflare, ~60 MB) arka planda iniyor; yavaş ağda uzun sürebilir.");
  bilgi("Bu sırada Kurultay kullanılabilir. İnince tünel kendiliğinden açılır ve “Telefonda aç” sayfasında görünür.");
  tunelAraciniIndir(async () => {
    const adres = await tunelBaslat();
    bilgi(adres ? `
  ◆ Tünel açıldı. Her yerden: ${adres}` : "Tünel açılamadı; telefon aynı Wi-Fi'dan bağlanabilir.");
  });
  return null;
}

/** PNG'yi tek resimli .ico dosyasına sarar (Windows kısayol simgesi PNG içeren ico'yu okur). */
function ico(png) {
  const b = Buffer.alloc(22);
  b.writeUInt16LE(1, 2); // tür: simge
  b.writeUInt16LE(1, 4); // resim sayısı
  b.writeUInt16LE(1, 10); // renk düzlemi
  b.writeUInt16LE(32, 12); // bit derinliği
  b.writeUInt32LE(png.length, 14);
  b.writeUInt32LE(22, 18); // resmin başladığı yer (genişlik/yükseklik 0 = 256)
  return Buffer.concat([b, png]);
}

/** Masaüstünde "Kurultay" kısayolu yoksa oluşturur (otağ simgeli, konsolu simge durumunda açar). */
async function kisayolKur() {
  try {
    const simge = path.join(ARACLAR, "kurultay.ico");
    if (!fs.existsSync(simge)) {
      const r = await fetch(`${ADRES}/ikon/256`);
      fs.mkdirSync(ARACLAR, { recursive: true });
      fs.writeFileSync(simge, ico(Buffer.from(await r.arrayBuffer())));
    }
    const hedef = path.resolve(KOK, "..", "Kurultay.cmd");
    const ps = `
      $masaustu = [Environment]::GetFolderPath('Desktop')
      $yol = Join-Path $masaustu 'Kurultay.lnk'
      if (Test-Path $yol) { exit 0 }
      $k = (New-Object -ComObject WScript.Shell).CreateShortcut($yol)
      $k.TargetPath = '${hedef.replace(/'/g, "''")}'
      $k.WorkingDirectory = '${path.dirname(hedef).replace(/'/g, "''")}'
      $k.IconLocation = '${simge.replace(/'/g, "''")},0'
      $k.WindowStyle = 7
      $k.Description = 'Kurultay: kamuoyu platformu'
      $k.Save()
      Write-Output 'kuruldu'`;
    const r = spawnSync("powershell", ["-NoProfile", "-EncodedCommand", Buffer.from(ps, "utf16le").toString("base64")], { encoding: "utf8" });
    if (r.stdout.includes("kuruldu")) bilgi("Masaüstüne Kurultay simgesi eklendi.");
  } catch {
    // Kısayol olmasa da uygulama çalışır
  }
}

function yerelAdresler() {
  const sanal = /vethernet|virtual|vmware|wsl|hyper-v|loopback|bluetooth/i;
  return Object.entries(os.networkInterfaces())
    .filter(([ad]) => !sanal.test(ad))
    .flatMap(([, l]) => (l ?? []).filter((a) => a.family === "IPv4" && !a.internal).map((a) => `http://${a.address}:${PORT}`));
}

function kapat() {
  for (const c of cocuklar) c.kill();
  fs.rmSync(TUNEL_DOSYASI, { force: true });
}
process.on("SIGINT", () => (kapat(), process.exit(0)));
process.on("SIGHUP", () => (kapat(), process.exit(0)));
process.on("exit", kapat);

// ---------------------------------------------------------------------------

console.log("\n  KURULTAY\n  ────────");
fs.mkdirSync(VERI, { recursive: true });

if ((await kurultayCalisiyorMu()) && !secenek.has("--demo") && !secenek.has("--derle")) {
  bilgi("Kurultay zaten açık; pencere getiriliyor.");
  pencereAc(ADRES);
  await bekle(1500);
  process.exit(0);
}
if (!(await portBosMu()) && !(await kurultayCalisiyorMu())) {
  bilgi(`${PORT} numaralı kapı başka bir program tarafından kullanılıyor. O programı kapatıp tekrar dene.`);
  process.exit(1);
}

// Pencere hemen açılır; sunucu hazır olunca kendiliğinden Kurultay'a geçer
pencereAc(`${pathToFileURL(path.join(KOK, "scripts", "acilis.html")).href}?port=${PORT}`);

if (!fs.existsSync(path.join(KOK, "node_modules", "next"))) {
  adim("Paketler kuruluyor (yalnızca ilk açılışta)…");
  npm("install");
}
if (secenek.has("--derle") || derlemeGerekiyor()) {
  adim("Uygulama derleniyor (kod değiştiyse, yaklaşık yarım dakika)…");
  npm("run", "build");
}
if (secenek.has("--demo") || (await veritabaniBosMu())) {
  adim("Demo verisi kuruluyor…");
  npm("run", "demo");
}

adim("Sunucu açılıyor…");
if (!(await sunucuyuAc())) {
  bilgi("Sunucu bir dakikada açılamadı. Ayrıntı: forum/veri/sunucu.log");
  process.exit(1);
}
await kisayolKur();
bilgi(`Bu bilgisayarda:  ${ADRES}`);
for (const a of yerelAdresler()) bilgi(`Aynı Wi-Fi'dan:   ${a}`);

adim("Telefon için güvenli (HTTPS) adres açılıyor…");
const tunel = await tuneliAc();
if (tunel) bilgi(`Her yerden:       ${tunel}`);
else if (fs.existsSync(CLOUDFLARED) && !secenek.has("--tunelsiz")) bilgi("Tünel açılamadı; telefon aynı Wi-Fi'dan bağlanabilir.");

console.log(`
  ◆ Kurultay hazır.
    Telefonda açmak için uygulamada sağ üstteki telefon simgesine (Telefonda aç) bas, karekodu okut.
    Bu pencere açık kaldıkça Kurultay çalışır. Kapatmak için bu pencereyi kapat.
`);
