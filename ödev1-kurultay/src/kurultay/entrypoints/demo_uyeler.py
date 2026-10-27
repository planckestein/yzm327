"""Demo topluluğu: tartışmalarda konuşan üyeler ve onların arkasındaki binlerce sessiz üye.

Her üyenin bir siyasi eğilimi vardır (yalnızca demo üretimi için; sistemde böyle bir alan yoktur, kimse
görüşüyle etiketlenmez). Eğilim, hangi kavramları takip ettiğini ve oylamalarda nasıl oy vereceğini belirler.
Yelpaze bilerek geniştir: aşırı soldan aşırı sağa herkes burada yazar. Kurultay'da tek yasak tehdittir.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import date

# Eğilimler (yalnızca demo üretimi için)
ASIRI_SOL, SOL, MERKEZ, SAG, ASIRI_SAG = "asiri_sol", "sol", "merkez", "sag", "asiri_sag"
EGILIMLER = (ASIRI_SOL, SOL, MERKEZ, SAG, ASIRI_SAG)
EGILIM_PAYI = {ASIRI_SOL: 0.09, SOL: 0.22, MERKEZ: 0.30, SAG: 0.26, ASIRI_SAG: 0.13}


@dataclass(frozen=True)
class Uye:
    nick: str
    ad: str
    soyad: str
    dogum: date
    adres: str
    ilgi: tuple[str, ...]
    egilim: str
    gun: float = 0.0  # kaçıncı günde katıldı


# Tartışmalarda konuşan üyeler. İlk on kişi Kurultay'ın ilk kullanıcıları.
KONUSANLAR: list[Uye] = [
    Uye("ayse_hukuk", "Ayşe", "Kaya", date(1988, 4, 12), "Çankaya, Ankara", ("hukuk", "temel-haklar", "basin", "kurultay"), SOL),
    Uye("mehmet_iktisat", "Mehmet", "Demir", date(1979, 9, 3), "Kadıköy, İstanbul", ("ekonomi", "vergi", "ucretler", "kurultay"), MERKEZ),
    Uye("zeynep_veri", "Zeynep", "Arslan", date(1996, 1, 22), "Bornova, İzmir", ("dijital", "veri-gizliligi", "temel-haklar"), MERKEZ),
    Uye("can_ogretmen", "Can", "Yıldız", date(1985, 11, 30), "Nilüfer, Bursa", ("egitim", "sinav", "toplum"), SOL),
    Uye("elif_iklim", "Elif", "Şahin", date(1999, 6, 8), "Muratpaşa, Antalya", ("cevre", "sehir", "dijital"), SOL),
    Uye("deniz_yazilim", "Deniz", "Çelik", date(1993, 2, 17), "Yenimahalle, Ankara", ("dijital", "yz-duzenleme", "ekonomi", "kurultay"), MERKEZ),
    Uye("burak_sehir", "Burak", "Aydın", date(1990, 8, 25), "Tepebaşı, Eskişehir", ("sehir", "cevre", "guvenlik", "kurultay"), SAG),
    Uye("selin_hekim", "Selin", "Koç", date(1987, 3, 14), "Selçuklu, Konya", ("saglik", "toplum", "egitim"), SOL),
    Uye("emre_ogrenci", "Emre", "Öztürk", date(2004, 12, 1), "Atakum, Samsun", ("yuksekogretim", "egitim", "ekonomi", "dijital"), SOL),
    Uye("gul_esnaf", "Gül", "Yılmaz", date(1975, 5, 19), "Merkezefendi, Denizli", ("ekonomi", "vergi", "sehir", "kurultay"), SAG),
    # sonradan katılanlar
    Uye("sancak_murat", "Murat", "Erdem", date(1968, 2, 9), "Etimesgut, Ankara", ("guvenlik", "toplum", "hukuk", "ekonomi"), ASIRI_SAG, 1.2),
    Uye("kara_tolga", "Tolga", "Karakaya", date(1998, 10, 3), "Esenyurt, İstanbul", ("guvenlik", "toplum", "ucretler"), ASIRI_SAG, 2.1),
    Uye("turkmen_kizi", "Sevda", "Türkmen", date(1983, 7, 21), "Seyhan, Adana", ("guvenlik", "toplum", "egitim"), ASIRI_SAG, 2.6),
    Uye("omer_faruk_k", "Ömer Faruk", "Kılıç", date(1981, 1, 14), "Meram, Konya", ("toplum", "egitim", "temel-haklar", "guvenlik"), SAG, 1.5),
    Uye("hilal_dmr", "Hilal", "Demirtaş", date(1992, 5, 2), "Sultangazi, İstanbul", ("toplum", "egitim", "saglik"), SAG, 3.0),
    Uye("anadolu_tuccari", "Hüseyin", "Ateş", date(1972, 12, 30), "Melikgazi, Kayseri", ("ekonomi", "vergi", "guvenlik"), SAG, 2.4),
    Uye("serbest_piyasaci", "Kerem", "Uysal", date(1989, 3, 27), "Beşiktaş, İstanbul", ("ekonomi", "vergi", "dijital"), MERKEZ, 1.8),
    Uye("ozgur_soz", "Barış", "Tuna", date(1986, 9, 11), "Karşıyaka, İzmir", ("basin", "temel-haklar", "dijital", "kurultay"), MERKEZ, 0.6),
    Uye("laik_nesrin", "Nesrin", "Aksoy", date(1958, 4, 23), "Konak, İzmir", ("egitim", "temel-haklar", "hukuk"), SOL, 2.9),
    Uye("komun_zehra", "Zehra", "Polat", date(1997, 11, 7), "Kadıköy, İstanbul", ("ucretler", "vergi", "temel-haklar", "guvenlik"), ASIRI_SOL, 1.1),
    Uye("sinif_bilinci", "Hakan", "Bulut", date(1980, 6, 16), "Gebze, Kocaeli", ("ucretler", "vergi", "ekonomi"), ASIRI_SOL, 2.2),
    Uye("devrimci_okan", "Okan", "Şimşek", date(2003, 2, 28), "Çankaya, Ankara", ("yuksekogretim", "temel-haklar", "hukuk", "kurultay"), ASIRI_SOL, 3.4),
    Uye("yesil_baris", "Barış", "Gök", date(1994, 8, 19), "Ortahisar, Trabzon", ("cevre", "sehir", "saglik"), SOL, 4.1),
    Uye("pati_dostu", "Melis", "Arıkan", date(1995, 12, 12), "Çiğli, İzmir", ("sehir", "toplum", "cevre"), SOL, 5.0),
    Uye("guvenli_sokak", "Fatma", "Turan", date(1984, 3, 5), "Keçiören, Ankara", ("sehir", "toplum", "saglik", "guvenlik"), SAG, 4.6),
    Uye("muhendis_kerem", "Kerem", "Yalçın", date(1977, 10, 25), "Bayraklı, İzmir", ("sehir", "cevre", "ekonomi"), MERKEZ, 1.9),
    Uye("hemsire_ayten", "Ayten", "Çetin", date(1979, 1, 30), "Yüreğir, Adana", ("saglik", "ucretler", "toplum"), SOL, 6.0),
    Uye("emekli_hasan", "Hasan", "Doğan", date(1955, 7, 7), "Şahinbey, Gaziantep", ("ekonomi", "ucretler", "guvenlik", "saglik"), SAG, 2.8),
    Uye("veteriner_ece", "Ece", "Önal", date(1991, 4, 4), "Odunpazarı, Eskişehir", ("saglik", "sehir", "cevre"), MERKEZ, 7.3),
    Uye("avukat_kaan", "Kaan", "Ersoy", date(1985, 6, 1), "Osmangazi, Bursa", ("hukuk", "guvenlik", "yargi", "basin"), SAG, 3.7),
    Uye("tarihci_selim", "Selim", "Kurt", date(1970, 11, 19), "Altındağ, Ankara", ("egitim", "toplum", "hukuk"), MERKEZ, 8.2),
    Uye("kurye_baris", "Barış", "Akın", date(2000, 1, 9), "Bağcılar, İstanbul", ("ucretler", "sehir", "dijital"), SOL, 9.0),
    Uye("girisimci_ipek", "İpek", "Sezer", date(1993, 9, 22), "Ataşehir, İstanbul", ("ekonomi", "dijital", "vergi", "yz-duzenleme"), MERKEZ, 5.5),
    Uye("yusuf_hoca", "Yusuf", "Oral", date(1976, 5, 17), "Eyüpsultan, İstanbul", ("egitim", "toplum", "temel-haklar"), SAG, 11.5),
    Uye("mor_dayanisma", "Derya", "Ural", date(1990, 2, 2), "Çankaya, Ankara", ("temel-haklar", "toplum", "ucretler"), ASIRI_SOL, 12.4),
    Uye("ciftci_ramazan", "Ramazan", "Tekin", date(1966, 8, 8), "Akşehir, Konya", ("cevre", "ekonomi", "toplum"), SAG, 13.0),
    Uye("akademisyen_nur", "Nur", "Işık", date(1982, 12, 5), "Bornova, İzmir", ("yuksekogretim", "hukuk", "temel-haklar", "basin", "kurultay"), SOL, 1.6),
    Uye("polis_emeklisi", "Çetin", "Karaca", date(1961, 3, 18), "Pamukkale, Denizli", ("guvenlik", "hukuk", "toplum"), ASIRI_SAG, 4.4),
    Uye("sert_yorumcu", "Volkan", "Duman", date(1988, 7, 29), "Kepez, Antalya", ("guvenlik", "ekonomi", "sehir", "basin"), ASIRI_SAG, 6.5),
    Uye("uzay_cocugu", "Arda", "Ay", date(2006, 4, 1), "Atakum, Samsun", ("dijital", "egitim", "sehir"), MERKEZ, 10.2),
    Uye("indirim_dunyasi", "Kampanya", "Mağazası", date(1990, 1, 1), "Merkez, Denizli", ("saglik", "basin", "ekonomi"), MERKEZ, 8.8),
    Uye("bakkal_nihat", "Nihat", "Eren", date(1964, 10, 10), "Tepebaşı, Eskişehir", ("ekonomi", "vergi", "sehir"), SAG, 14.0),
    Uye("doktor_baran", "Baran", "Yiğit", date(1990, 6, 6), "Kayapınar, Diyarbakır", ("saglik", "temel-haklar", "egitim"), SOL, 15.5),
    Uye("ulkucu_emre", "Emre", "Bozkurt", date(2001, 3, 3), "Pursaklar, Ankara", ("guvenlik", "toplum", "egitim"), ASIRI_SAG, 16.0),
    Uye("sendikaci_gonul", "Gönül", "Avcı", date(1974, 9, 9), "Bayraklı, İzmir", ("ucretler", "saglik", "vergi"), ASIRI_SOL, 9.6),
]

YZ_AJANLARI = [
    ("yz_hukukcu", ("hukuk", "temel-haklar", "basin", "kurultay"), "kural"),
    ("yz_iktisatci", ("ekonomi", "egitim"), "kural"),
    ("yz_teknolog", ("dijital", "cevre", "kurultay"), "ollama:llama3.2"),
]

# ---------------------------------------------------------------- sessiz çoğunluk

_KADIN = ("Ayşe Fatma Zeynep Elif Merve Büşra Esra Kübra Emine Hatice Zehra Seda Gizem Ceren Derya Ebru Pınar Sibel "
          "Aslı Burcu Nazlı Melis İrem Sena Yağmur Ece Defne Duygu Gamze Tuğba Sevgi Nur Hilal Özge Damla Selin "
          "Cansu Dilara Beyza Nisa Rabia Şeyma Sude Eylül Buse Ezgi Aleyna Feyza Gülşen Hacer Nermin Songül Yasemin").split()
_ERKEK = ("Mehmet Mustafa Ahmet Ali Hüseyin Hasan İbrahim Murat Ömer Yusuf Emre Burak Can Kerem Mert Onur Serkan "
          "Tolga Volkan Barış Cem Deniz Engin Gökhan Halil Kaan Levent Oğuz Ozan Recep Sinan Tuncay Umut Yasin "
          "Berk Arda Efe Batuhan Furkan Enes Taha Eren Alper Erkan Erdem Fatih Kadir Selçuk Tayfun Ufuk Cengiz").split()
_SOYAD = ("Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara "
          "Koç Kurt Özkan Şimşek Polat Korkmaz Erdoğan Güneş Aktaş Bulut Keskin Özer Ünal Tekin Taş Çakır Uçar "
          "Akgül Sarı Bozkurt Kaplan Turan Avcı Karaca Gök Coşkun Yavuz Acar Bayram Işık Erdem Altun Durmaz").split()
_IL = [("Ankara", "06", ("Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut", "Sincan", "Altındağ")),
       ("İstanbul", "34", ("Kadıköy", "Üsküdar", "Esenyurt", "Bağcılar", "Pendik", "Ümraniye", "Beşiktaş", "Fatih", "Bakırköy", "Sultanbeyli")),
       ("İzmir", "35", ("Karşıyaka", "Bornova", "Buca", "Konak", "Çiğli", "Bayraklı")),
       ("Bursa", "16", ("Osmangazi", "Nilüfer", "Yıldırım")),
       ("Antalya", "07", ("Muratpaşa", "Kepez", "Konyaaltı")),
       ("Adana", "01", ("Seyhan", "Çukurova", "Yüreğir")),
       ("Konya", "42", ("Selçuklu", "Meram", "Karatay")),
       ("Gaziantep", "27", ("Şahinbey", "Şehitkamil")),
       ("Kayseri", "38", ("Melikgazi", "Kocasinan")),
       ("Trabzon", "61", ("Ortahisar", "Akçaabat")),
       ("Samsun", "55", ("Atakum", "İlkadım")),
       ("Eskişehir", "26", ("Tepebaşı", "Odunpazarı")),
       ("Diyarbakır", "21", ("Kayapınar", "Bağlar")),
       ("Erzurum", "25", ("Yakutiye", "Palandöken")),
       ("Mersin", "33", ("Yenişehir", "Mezitli")),
       ("Denizli", "20", ("Pamukkale", "Merkezefendi")),
       ("Malatya", "44", ("Battalgazi", "Yeşilyurt")),
       ("Sakarya", "54", ("Adapazarı", "Serdivan"))]
_IL_AGIRLIK = [14, 22, 10, 5, 4, 4, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 2]
_LAKAP = ("kosucu kitapkurdu balikci gezgin muhendis ogretmen hemsire sofor kurye ciftci esnaf avukat mimar "
          "fotografci kahveci bisikletci dagci emekli memur ogrenci yazar okur gece sabah deniz kuzey").split()

_ILGI = {
    ASIRI_SOL: {"ucretler": 5, "vergi": 4, "temel-haklar": 4, "cevre": 3, "basin": 3, "yuksekogretim": 2, "saglik": 2, "guvenlik": 1},
    SOL: {"egitim": 4, "cevre": 4, "temel-haklar": 3, "saglik": 3, "ucretler": 3, "sehir": 3, "basin": 2, "yuksekogretim": 2, "dijital": 2},
    MERKEZ: {"ekonomi": 4, "dijital": 3, "sehir": 4, "egitim": 3, "saglik": 3, "hukuk": 2, "yz-duzenleme": 1, "veri-gizliligi": 1, "cevre": 2, "sinav": 2},
    SAG: {"ekonomi": 4, "toplum": 4, "guvenlik": 3, "egitim": 3, "vergi": 3, "sehir": 3, "saglik": 2, "hukuk": 2},
    ASIRI_SAG: {"guvenlik": 6, "toplum": 4, "hukuk": 3, "ekonomi": 3, "ucretler": 1, "egitim": 2},
}


def _kucuk(s: str) -> str:
    return s.replace("İ", "i").replace("I", "ı").lower()


def _ascii(s: str) -> str:
    return s.translate(str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU"))


def _nick(rng: random.Random, ad: str, soyad: str, il: str, plaka: str, yil: int, alinan: set[str]) -> str:
    a, s = _kucuk(ad), _kucuk(soyad)
    if rng.random() < 0.55:
        a, s = _ascii(a), _ascii(s)
    secenekler = [
        f"{a}_{s}", f"{a}{s[:1]}{rng.randint(1, 99)}", f"{a}{plaka}", f"{a}_{yil % 100:02d}", f"{a}{yil}",
        f"{rng.choice(_LAKAP)}_{a}", f"{a}_{_ascii(_kucuk(il))}", f"{a[:1]}{s}", f"{s}_{a[:1]}{rng.randint(1, 9)}",
        f"{a}{s}", f"{a}_{plaka}_{s[:3]}", f"{rng.choice(_LAKAP)}{rng.randint(10, 999)}",
    ]
    rng.shuffle(secenekler)
    for nick in secenekler:
        nick = nick.replace(" ", "")
        if 3 <= len(nick) <= 20 and nick.lower() not in alinan:
            alinan.add(nick.lower())
            return nick
    nick = f"{_ascii(a)[:12]}_{rng.randint(1000, 9999)}"
    alinan.add(nick.lower())
    return nick


def sessiz_cogunluk(sayi: int, gun_sayisi: float, seed: int = 1071) -> list[Uye]:
    """Tartışmalara yazmayan ama oylamalara katılan binlerce üye. Katılımlar zamana yayılır."""
    rng = random.Random(seed)
    alinan = {u.nick.lower() for u in KONUSANLAR} | {a[0] for a in YZ_AJANLARI}
    egilimler = list(EGILIM_PAYI)
    agirliklar = list(EGILIM_PAYI.values())
    uyeler = []
    for i in range(sayi):
        kadin = rng.random() < 0.47
        ad = rng.choice(_KADIN if kadin else _ERKEK)
        soyad = rng.choice(_SOYAD)
        il, plaka, ilceler = rng.choices(_IL, weights=_IL_AGIRLIK)[0]
        yil = int(rng.triangular(1950, 2008, 1992))
        dogum = date(yil, rng.randint(1, 12), rng.randint(1, 28))
        egilim = rng.choices(egilimler, weights=agirliklar)[0]
        tablo = _ILGI[egilim]
        ilgi = set(rng.choices(list(tablo), weights=list(tablo.values()), k=rng.randint(2, 4)))
        if rng.random() < 0.18:
            ilgi.add(rng.choice(("dijital", "saglik", "egitim", "sehir", "cevre", "ekonomi", "basin", "sinav")))
        if rng.random() < 0.035:
            ilgi.add("kurultay")
        # ilk günler kalabalık, sonra her gün yeni katılımlar
        gun = rng.uniform(0, 1.5) if i < sayi * 0.12 else rng.uniform(1.5, gun_sayisi)
        uyeler.append(Uye(_nick(rng, ad, soyad, il, plaka, yil, alinan), ad, soyad, dogum,
                          f"{rng.choice(ilceler)}, {il}", tuple(sorted(ilgi)), egilim, gun))
    return uyeler
