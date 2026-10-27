"""Tehdit kuralı için etiketli değerlendirme seti (Hafta 2: "baseline olmadan sayı anlamsız").

Etiket kılavuzu: **tehdit** (true threat), belirli bir kişiye ya da gruba yöneltilmiş ciddi bir şiddet niyeti
beyanıdır. Hakaret, sert eleştiri, abartı, mecaz, haber dili ve başkasının tehdidini aktarmak tehdit değildir.

Sınırlılık: set küçüktür ve tek kişi tarafından etiketlendi. Kuralın kaçıracağı bilinen örtük tehditler ve yanlış
alarm vereceği bilinen örnekler bilerek eklendi; kural bu sete göre ayarlanmadı (set ilk sürümden aynen taşındı).
Gerçek kullanımda iki kişinin bağımsız etiketlemesi ve aralarındaki uyumun (Cohen kappa) ölçülmesi gerekir.
"""

from __future__ import annotations

THREAT_SET: tuple[tuple[str, bool], ...] = (
    ('Seni öldürürüm, bunu unutma.', True),
    ('Adresini biliyorum, akşam kapında olacağım.', True),
    ('Bir daha bu konuyu açarsan kafanı kırarım.', True),
    ('Seni bulacağım ve pişman olacaksın.', True),
    ('Canına okuyacağım senin.', True),
    ('Ailenizi tek tek bulup gebertiriz.', True),
    ('Sokakta görürsem seni bıçaklarım.', True),
    ('Evini yakacağım, haberin olsun.', True),
    ('Senin gibileri asarım ben, sıran gelecek.', True),
    ('Yarın okulun önünde bekliyor olacağım, çocuğunu bir daha göremezsin.', True),
    ('Hepinizi tek tek vuracağım.', True),
    ('Sonun gelecek, bekle.', True),
    ('Kafana sıkacağım.', True),
    ('Seni boğarım, yemin ederim.', True),
    ('Bir gece evine gelip seni keseceğim.', True),
    ('Annenizi de sizi de yakarım.', True),
    ('Bunu yazdıktan sonra yaşamayacaksın.', True),
    ('Bu mesajı silmezsen seni döverim.', True),
    ('Arabana bomba koyacağım.', True),
    ('Mahallede seni gören dövecek, ben söyledim.', True),
    ('Yapay zeka insanlığı öldürür mü?', False),
    ('Bu bakan tam bir beceriksiz, derhal istifa etmeli.', False),
    ('Gülmekten öldüm, harika bir yorum.', False),
    ('Polis şüpheliyi bacağından vurdu.', False),
    ('Bu yasa tasarısını yakın, kâğıda bile değmez.', False),
    ('Seni tavlada döverim, gel bir el atalım.', False),
    ('Enflasyon emekliyi öldürüyor.', False),
    ('Bu karar demokrasiyi katleder.', False),
    ('Kesinlikle katılmıyorum, argümanın çok zayıf.', False),
    ('Sen tam bir cahilsin, okumadan yazıyorsun.', False),
    ('Ahmak mısın nesin, verileri hiç mi görmedin?', False),
    ('Bütçeyi keseceğiz ama eğitimi değil.', False),
    ('Kömür santrallerini kapatıp karbonu keselim.', False),
    ('İdam cezası geri gelsin diyorum, teröristler asılmalı.', False),
    ('Seni bulmak için çok aradım, sonunda forumda gördüm.', False),
    ('Bu filmde katil kurbanını bıçakla öldürüyor.', False),
    ('Rakip takımı 3-0 yeneriz, sahada ezeriz.', False),
    ('Telefonumu kırarım bu güncellemeyle.', False),
    ('Sınırları kapatın, kaçak göçü durdurun.', False),
    ('Vergileri yakan bir hükümet bu.', False),
    ('Seni çok seviyorum Kurultay, harika iş.', False),
    ('Onu dövmesinler diye polise haber verdim.', False),
    ('Adresini bilmiyorum, kargo nereye gidecek?', False),
    ('Bu ekonomi politikası esnafı bitirdi, canına okudu.', False),
    ('Saçma sapan konuşma, seni ciddiye alan yok.', False),
    ('Gazeteciler hapse atılmamalı.', False),
    ('Seni gidi seni, yine haklı çıktın.', False),
    ('Kafanı kullan biraz, rakamlar ortada.', False),
    ('Ben olsam bu kanunu yırtar atardım.', False),
    ('Hepinizi tebrik ederim, güzel uzlaşma.', False),
    ('Kır düğününe hepinizi beklerim.', False),
    ('Asgari ücreti artırırsanız sizi seçerim.', False),
    ('Sizi yakından takip ediyorum, iyi iş çıkarıyorsunuz.', False),
    ('Pazartesi grev yapacağız, yolları keseceğiz.', False),
    ('Bu tartışmayı keserim artık, uzadı.', False),
    ('Konuyu kapatmazsanız sizi şikâyet ederim.', False),
    ('Ağzını burnunu kırarım diyenler oldu, bunu kınıyorum.', False),
    ('Hocam sizi çok seviyoruz.', False),
    ('Senin yerinde olsam istifa ederdim.', False),
    ('“Seni öldürürüm” diye yazan hesabı kınıyorum.', False),
)
