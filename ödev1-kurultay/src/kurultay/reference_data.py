"""Başlangıç ontolojisi ve ilk yönetmelik. Yeni kavramlar ileride oylamayla eklenebilir.

İlk sürümdeki 11 ana + 8 alt bölümlük ağaç korunmuştur; bunlara disiplinler arası "ilişkili" kenarlar eklenmiştir.
"""

from __future__ import annotations

from datetime import datetime

from kurultay.domain.ontology import Concept, Ontology
from kurultay.domain.regulation import Regulation
from kurultay.service_layer.unit_of_work import AbstractUnitOfWork

_TREE: list[tuple[str, str, str, str, list[tuple[str, str, str, str]]]] = [
    ("hukuk", "Anayasa ve Hukuk", "Anayasa, yargı, yasalar ve temel haklar.",
     "anayasa,hukuk,yargı,mahkeme,yasa,kanun,hak,adalet,hakim,hâkim,savcı,dava,ceza,seçim",
     [("yargi", "Yargı Bağımsızlığı", "Hâkim atamaları, yargı kurulları ve mahkemelerin tarafsızlığı.",
       "yargı,hakim,hâkim,savcı,mahkeme,bağımsız,atama,kurul,tarafsız"),
      ("temel-haklar", "Temel Haklar", "Eşitlik, toplanma, gösteri ve ayrımcılık yasağı.",
       "hak,özgürlük,eşitlik,ayrımcılık,toplantı,gösteri,din,vicdan,engelli,kadın")]),
    ("basin", "İfade Özgürlüğü ve Basın", "Basın özgürlüğü, sansür, erişim engelleri ve gazetecilik.",
     "ifade,basın,gazeteci,sansür,yayın,medya,haber,erişim engel,sosyal medya,özgürlük,dezenformasyon,yasak", []),
    ("ekonomi", "Ekonomi ve Çalışma Hayatı", "Enflasyon, ücretler, vergiler, istihdam ve bütçe.",
     "ekonomi,enflasyon,ücret,vergi,bütçe,işsiz,istihdam,emekli,maaş,fiyat,kira,faiz,esnaf,çiftçi,tarım",
     [("ucretler", "Ücretler ve İstihdam", "Asgari ücret, emeklilik, sendikalar ve çalışma koşulları.",
       "asgari ücret,maaş,işsiz,istihdam,sendika,çalışma,mesai,emekli,işçi,uzaktan çalışma"),
      ("vergi", "Vergi ve Bütçe", "Vergi adaleti, kamu harcamaları ve bütçe şeffaflığı.",
       "vergi,bütçe,harcama,borç,kdv,gelir,şeffaf,kamu ihale")]),
    ("egitim", "Eğitim", "Okullar, sınav sistemi, öğretmenler ve üniversiteler.",
     "eğitim,okul,öğretmen,öğrenci,sınav,üniversite,müfredat,ders,veli,dershane",
     [("sinav", "Sınav Sistemi", "Merkezi sınavlar, dershaneler ve fırsat eşitliği.",
       "sınav,lgs,yks,puan,dershane,kurs,test,eşitlik"),
      ("yuksekogretim", "Yükseköğretim", "Üniversiteler, burslar, yurtlar ve akademik özgürlük.",
       "üniversite,burs,yurt,akademi,akademisyen,harç,rektör,kampüs")]),
    ("saglik", "Sağlık", "Hastaneler, sağlık çalışanları, ilaç ve sağlık sigortası.",
     "sağlık,hastane,doktor,hekim,ilaç,hasta,randevu,sigorta,aşı,hemşire,acil", []),
    ("cevre", "Çevre ve Enerji", "İklim krizi, enerji dönüşümü, su ve doğanın korunması.",
     "çevre,iklim,enerji,karbon,kömür,güneş,rüzgar,orman,su,kuraklık,atık,geri dönüşüm,maden,santral", []),
    ("dijital", "Dijital Haklar ve Teknoloji", "İnternet özgürlüğü, kişisel veriler ve yapay zekânın düzenlenmesi.",
     "dijital,internet,veri,gizlilik,yapay zeka,yapay zekâ,algoritma,siber,teknoloji,platform,kişisel veri,yüz tanıma",
     [("veri-gizliligi", "Veri Gizliliği", "Kişisel verilerin korunması, gözetim ve izleme.",
       "veri,gizlilik,kişisel,izleme,kamera,yüz tanıma,gözetim,sızıntı"),
      ("yz-duzenleme", "Yapay Zekâ Düzenlemesi", "Kamuda algoritmalar, şeffaflık ve hesap verebilirlik.",
       "yapay zeka,yapay zekâ,algoritma,otomasyon,yz,model,şeffaf,hesap verebilir")]),
    ("sehir", "Şehirler ve Ulaşım", "Toplu taşıma, konut, deprem hazırlığı ve kent planlaması.",
     "şehir,kent,ulaşım,toplu taşıma,metro,otobüs,trafik,konut,kira,deprem,imar,bisiklet,belediye", []),
    ("guvenlik", "Güvenlik ve Göç", "Göç politikası, sınır güvenliği, asayiş, askerlik ve savunma.",
     "göç,göçmen,mülteci,sığınmacı,sınır,güvenlik,asayiş,polis,suç,ceza,terör,asker,askerlik,savunma", []),
    ("toplum", "Aile ve Toplum", "Aile politikaları, nüfus, çocuk ve gençlik.",
     "aile,nüfus,doğum,çocuk,evlilik,anne,baba,gelenek,gençlik,kreş", []),
    ("kurultay", "Kurultay Hakkında", "Platformun yönetmeliği, oylama düzeni ve işleyişi.",
     "platform,kurultay,oylama,yönetmelik,ilke,azınlık,çoğunluk,strateji", []),
]

_RELATED = [
    ("veri-gizliligi", "temel-haklar"),
    ("yz-duzenleme", "hukuk"),
    ("basin", "temel-haklar"),
    ("cevre", "sehir"),
    ("ucretler", "vergi"),
    ("yuksekogretim", "ekonomi"),
    ("saglik", "toplum"),
]


def build_ontology() -> Ontology:
    ontology = Ontology()
    for cid, name, description, keywords, children in _TREE:
        ontology.add(Concept(cid, name, description, tuple(k.strip() for k in keywords.split(","))))
        for child_id, child_name, child_description, child_keywords in children:
            ontology.add(
                Concept(child_id, child_name, child_description, tuple(k.strip() for k in child_keywords.split(",")), cid)
            )
    for a, b in _RELATED:
        ontology.relate(a, b)
    return ontology


def ensure_reference_data(uow_factory: object, now: datetime) -> None:
    """Ontoloji ve yönetmelik yoksa oluşturur (ilk açılış)."""
    uow: AbstractUnitOfWork = uow_factory()  # type: ignore[operator]
    with uow:
        if not uow.ontology.get().concepts:
            uow.ontology.save(build_ontology())
        if not uow.regulations.history():
            uow.regulations.append(Regulation(), None, now)
        uow.commit()
