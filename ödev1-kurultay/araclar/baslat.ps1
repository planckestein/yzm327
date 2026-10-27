<#
  KURULTAY BAŞLATICI — masaüstündeki Kurultay simgesi bunu çalıştırır (Kurultay.cmd üzerinden).

  1. Kurultay zaten açıksa yalnızca tarayıcıda yeniden açar.
  2. Kurultay hazır olunca varsayılan tarayıcıda kendi penceresinde açar (Brave, Chrome vb.).
  3. Taşınabilir Python yoksa indirir (python.org, ücretsiz) ve paketleri kurar — yalnızca ilk açılışta.
     Bilgisayarda kurulu Python'a dokunmaz; her şey bu klasördeki araclar\python içinde kalır.
  4. Masaüstündeki Kurultay simgesini bu klasöre ve otağ ikonuna bağlar.
  5. Sunucuyu açar (python -m kurultay). Bu pencere kapanınca Kurultay da kapanır.

  Seçenekler:  -Demo   demo verisini baştan kurar
#>
param([switch]$Demo)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Kok      = Split-Path -Parent $PSScriptRoot
$Araclar  = $PSScriptRoot
$PyDizin  = Join-Path $Araclar 'python'
$Python   = Join-Path $PyDizin 'python.exe'
$Port     = 8000
$Adres    = "http://127.0.0.1:$Port"
$PyAdres  = 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip'
$PipAdres = 'https://bootstrap.pypa.io/get-pip.py'

function Adim($m)  { Write-Host "`n  > $m" -ForegroundColor Yellow }
function Bilgi($m) { Write-Host "    $m" }

function Tarayici($url) {
  # Varsayılan tarayıcıyı bulur (Brave, Chrome, Edge, Firefox...). Chromium tabanlıysa Kurultay'ı
  # adres çubuğu olmayan kendi penceresinde (uygulama penceresi) açar, değilse normal sekmede.
  $exe = $null
  try {
    $progId = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice' -ErrorAction Stop).ProgId
    $komut = (Get-ItemProperty "Registry::HKEY_CLASSES_ROOT\$progId\shell\open\command" -ErrorAction Stop).'(default)'
    if ($komut -match '^\s*"([^"]+)"') { $exe = $Matches[1] } elseif ($komut -match '^\s*(\S+)') { $exe = $Matches[1] }
  } catch { $exe = $null }
  if ($exe -and (Test-Path $exe) -and ((Split-Path $exe -Leaf) -match '^(brave|chrome|chromium|vivaldi|opera|msedge)\.exe$')) {
    Start-Process $exe -ArgumentList "--app=$url", '--window-size=1340,900'
  } else {
    Start-Process $url
  }
}

function Konsol([int]$durum) {
  # 9 = göster, 6 = simge durumuna küçült. Windows Terminal'de etkisiz kalabilir; zararı yok.
  try {
    if (-not ('Kurultay.Konsol' -as [type])) {
      Add-Type -Namespace Kurultay -Name Konsol -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")] public static extern System.IntPtr GetConsoleWindow();
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int n);
'@
    }
    [void][Kurultay.Konsol]::ShowWindow([Kurultay.Konsol]::GetConsoleWindow(), $durum)
  } catch { }
}

function Bekle($mesaj) {
  Konsol 9
  Write-Host "`n  $mesaj" -ForegroundColor Red
  Read-Host "`n  Kapatmak için Enter'a bas" | Out-Null
}

function KurultayAcikMi {
  try { (Invoke-WebRequest "$Adres/api/durum" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
}

function KisayolKur {
  try {
    $masaustu = [Environment]::GetFolderPath('Desktop')
    $yol = Join-Path $masaustu 'Kurultay.lnk'
    $hedef = Join-Path $Kok 'Kurultay.cmd'
    $simge = Join-Path $Araclar 'kurultay.ico'
    $k = (New-Object -ComObject WScript.Shell).CreateShortcut($yol)
    if ($k.TargetPath -eq $hedef -and $k.IconLocation -eq "$simge,0") { return }
    $k.TargetPath = $hedef
    $k.WorkingDirectory = $Kok
    $k.IconLocation = "$simge,0"
    $k.WindowStyle = 7
    $k.Description = 'Kurultay: oylamalı kamusal akıl'
    $k.Save()
    Bilgi 'Masaüstündeki Kurultay simgesi bu klasöre bağlandı.'
  } catch { Bilgi 'Masaüstü simgesi güncellenemedi (Kurultay yine de çalışır).' }
}

function PythonKur {
  Adim 'Taşınabilir Python indiriliyor (yalnızca ilk açılışta, ~11 MB)...'
  $zip = Join-Path $env:TEMP 'kurultay-python.zip'
  & curl.exe -L --retry 3 -sS -o $zip $PyAdres
  if ($LASTEXITCODE -ne 0) { throw 'Python indirilemedi. İnternet bağlantını kontrol et.' }
  if (Test-Path $PyDizin) { Remove-Item $PyDizin -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $PyDizin -Force
  Remove-Item $zip -Force
  $pth = Get-ChildItem $PyDizin -Filter 'python*._pth' | Select-Object -First 1
  $zipAdi = (Get-Content $pth.FullName | Where-Object { $_ -like '*.zip' } | Select-Object -First 1)
  Set-Content -Path $pth.FullName -Encoding ASCII -Value @($zipAdi, '.', '..\..\src', 'import site')
  Adim 'pip kuruluyor...'
  $getpip = Join-Path $PyDizin 'get-pip.py'
  & curl.exe -L --retry 3 -sS -o $getpip $PipAdres
  & $Python $getpip --no-warn-script-location -q
  if ($LASTEXITCODE -ne 0) { throw 'pip kurulamadı.' }
}

function PaketleriKur {
  $istek = Join-Path $Kok 'requirements.txt'
  $damga = Join-Path $PyDizin 'kurultay-paketler.txt'
  $ozet = (Get-FileHash $istek -Algorithm SHA256).Hash
  if ((Test-Path $damga) -and ((Get-Content $damga -Raw).Trim() -eq $ozet)) { return }
  Adim 'Paketler kuruluyor (FastAPI, SQLAlchemy, Jinja2...)...'
  & $Python -m pip install -q --disable-pip-version-check --no-warn-script-location -r $istek
  if ($LASTEXITCODE -ne 0) { throw 'Paketler kurulamadı. İnternet bağlantını kontrol et.' }
  Set-Content -Path $damga -Value $ozet -Encoding ASCII
}

# ---------------------------------------------------------------------------
Write-Host "`n  KURULTAY`n  ────────" -ForegroundColor Yellow

if ((KurultayAcikMi) -and $Demo) {
  Bekle 'Kurultay şu an açık. Demo verisini yenilemek için önce açık Kurultay penceresini kapat, sonra tekrar dene.'
  exit 1
}
if (KurultayAcikMi) {
  Bilgi 'Kurultay zaten açık; tarayıcıda açılıyor.'
  Tarayici $Adres
  exit 0
}

# Eski sürümün açılış ekranı artık kullanılmıyor (Kurultay hazır olunca doğrudan tarayıcıda açılır).
Remove-Item (Join-Path $Araclar 'acilis.html') -Force -ErrorAction SilentlyContinue

# İkinci kez tıklandıysa ve Kurultay hâlâ hazırlanıyorsa yeni bir kopya başlatma.
$veriDizin = Join-Path $Kok 'veri'
New-Item -ItemType Directory -Force $veriDizin | Out-Null
$kilit = Join-Path $veriDizin '.baslatiliyor'
if (Test-Path $kilit) {
  $eski = (Get-Content $kilit -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($eski -and (Get-Process -Id $eski -ErrorAction SilentlyContinue)) {
    Konsol 9
    Bilgi 'Kurultay zaten hazırlanıyor; bitince tarayıcıda kendiliğinden açılacak. Bu pencereyi kapatabilirsin.'
    Start-Sleep -Seconds 5
    exit 0
  }
}

# Cevap vermeyen ama arka planda kalmış eski Kurultay süreçleri (veritabanını kilitler) kapatılır.
# Yalnızca bu klasördeki taşınabilir Python'a ait süreçler hedeflenir.
Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -and ($_.ExecutablePath -ieq $Python) } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 800 }

# Hazırlık sürerken pencere görünür kalır (ilk açılışta kurulum ve demo verisi bir-iki dakika sürebilir).
Konsol 9

try {
  if (-not (Test-Path $Python)) { PythonKur }
  PaketleriKur
} catch {
  Bekle $_
  exit 1
}
KisayolKur

$env:KURULTAY_PORT = "$Port"
$env:KURULTAY_TARAYICI = '0'
if ($Demo) { $env:KURULTAY_DEMO_YENILE = '1' } else { Remove-Item Env:KURULTAY_DEMO_YENILE -ErrorAction SilentlyContinue }

Adim 'Sunucu açılıyor...'
$sunucu = Start-Process -FilePath $Python -ArgumentList '-m', 'kurultay' -WorkingDirectory $Kok -NoNewWindow -PassThru
Set-Content -Path $kilit -Value $sunucu.Id -Encoding ASCII

# Sunucu cevap verene kadar bekle (ilk açılışta demo verisi ~1 dakika sürer), sonra tarayıcıyı aç.
$hazir = $false
for ($i = 0; $i -lt 900; $i++) {
  if ($sunucu.HasExited) { break }
  if (KurultayAcikMi) { $hazir = $true; break }
  Start-Sleep -Milliseconds 400
}
Remove-Item $kilit -Force -ErrorAction SilentlyContinue
if (-not $hazir) {
  if (-not $sunucu.HasExited) { Stop-Process -Id $sunucu.Id -Force -ErrorAction SilentlyContinue }
  Bekle 'Kurultay açılamadı. Yukarıdaki hata yazısının ekran görüntüsünü gönderirsen düzeltilir.'
  exit 1
}

Tarayici $Adres
Write-Host "`n  ✓ Kurultay açık: $Adres" -ForegroundColor Green
Bilgi 'Bu pencere açık kaldıkça Kurultay çalışır. Kapatmak için bu pencereyi kapat.'
Bilgi 'Tarayıcı penceresini kapatırsan masaüstündeki Kurultay simgesiyle yeniden açabilirsin.'
Konsol 6
$sunucu.WaitForExit()
exit $sunucu.ExitCode
