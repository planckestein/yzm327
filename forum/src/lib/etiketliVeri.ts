/*
 * Tehdit denetimi için etiketli değerlendirme seti (Hafta 2: "baseline olmadan sayı anlamsız").
 *
 * Etiket kılavuzu — "tehdit" (true threat): belirli bir kişiye ya da gruba yöneltilmiş, ciddi bir şiddet niyeti
 * beyanı. Hakaret, sert eleştiri, abartı, mecaz, haber dili ve başkasının tehdidini aktarmak tehdit DEĞİLDİR.
 *
 * Sınırlılık: set küçük ve ekibimizce yazıldı. Kuralın kaçıracağını bildiğimiz örtük tehditler ve yanlış alarm
 * vereceğini bildiğimiz örnekler de bilerek eklendi; kural bu sete göre ayarlanmadı.
 * Gerçek kullanımda iki kişinin bağımsız etiketlemesi ve aralarındaki uyumun ölçülmesi gerekir (Cohen'in kappası).
 */

export const TEHDIT_SETI: [metin: string, tehdit: boolean][] = [
  // Tehdit
  ["Seni öldürürüm, bunu unutma.", true],
  ["Adresini biliyorum, akşam kapında olacağım.", true],
  ["Bir daha bu konuyu açarsan kafanı kırarım.", true],
  ["Seni bulacağım ve pişman olacaksın.", true],
  ["Canına okuyacağım senin.", true],
  ["Ailenizi tek tek bulup gebertiriz.", true],
  ["Sokakta görürsem seni bıçaklarım.", true],
  ["Evini yakacağım, haberin olsun.", true],
  ["Senin gibileri asarım ben, sıran gelecek.", true],
  ["Yarın okulun önünde bekliyor olacağım, çocuğunu bir daha göremezsin.", true],
  ["Hepinizi tek tek vuracağım.", true],
  ["Sonun gelecek, bekle.", true],
  ["Kafana sıkacağım.", true],
  ["Seni boğarım, yemin ederim.", true],
  ["Bir gece evine gelip seni keseceğim.", true],
  ["Annenizi de sizi de yakarım.", true],
  ["Bunu yazdıktan sonra yaşamayacaksın.", true],
  ["Bu mesajı silmezsen seni döverim.", true],
  ["Arabana bomba koyacağım.", true],
  ["Mahallede seni gören dövecek, ben söyledim.", true],

  // Tehdit değil
  ["Yapay zeka insanlığı öldürür mü?", false],
  ["Bu bakan tam bir beceriksiz, derhal istifa etmeli.", false],
  ["Gülmekten öldüm, harika bir yorum.", false],
  ["Polis şüpheliyi bacağından vurdu.", false],
  ["Bu yasa tasarısını yakın, kâğıda bile değmez.", false],
  ["Seni tavlada döverim, gel bir el atalım.", false],
  ["Enflasyon emekliyi öldürüyor.", false],
  ["Bu karar demokrasiyi katleder.", false],
  ["Kesinlikle katılmıyorum, argümanın çok zayıf.", false],
  ["Sen tam bir cahilsin, okumadan yazıyorsun.", false],
  ["Ahmak mısın nesin, verileri hiç mi görmedin?", false],
  ["Bütçeyi keseceğiz ama eğitimi değil.", false],
  ["Kömür santrallerini kapatıp karbonu keselim.", false],
  ["İdam cezası geri gelsin diyorum, teröristler asılmalı.", false],
  ["Seni bulmak için çok aradım, sonunda forumda gördüm.", false],
  ["Bu filmde katil kurbanını bıçakla öldürüyor.", false],
  ["Rakip takımı 3-0 yeneriz, sahada ezeriz.", false],
  ["Telefonumu kırarım bu güncellemeyle.", false],
  ["Sınırları kapatın, kaçak göçü durdurun.", false],
  ["Vergileri yakan bir hükümet bu.", false],
  ["Seni çok seviyorum Kurultay, harika iş.", false],
  ["Onu dövmesinler diye polise haber verdim.", false],
  ["Adresini bilmiyorum, kargo nereye gidecek?", false],
  ["Bu ekonomi politikası esnafı bitirdi, canına okudu.", false],
  ["Saçma sapan konuşma, seni ciddiye alan yok.", false],
  ["Gazeteciler hapse atılmamalı.", false],
  ["Seni gidi seni, yine haklı çıktın.", false],
  ["Kafanı kullan biraz, rakamlar ortada.", false],
  ["Ben olsam bu kanunu yırtar atardım.", false],
  ["Hepinizi tebrik ederim, güzel uzlaşma.", false],
  ["Kır düğününe hepinizi beklerim.", false],
  ["Asgari ücreti artırırsanız sizi seçerim.", false],
  ["Sizi yakından takip ediyorum, iyi iş çıkarıyorsunuz.", false],
  ["Pazartesi grev yapacağız, yolları keseceğiz.", false],
  ["Bu tartışmayı keserim artık, uzadı.", false],
  ["Konuyu kapatmazsanız sizi şikâyet ederim.", false],
  ["Ağzını burnunu kırarım diyenler oldu, bunu kınıyorum.", false],
  ["Hocam sizi çok seviyoruz.", false],
  ["Senin yerinde olsam istifa ederdim.", false],
  ["“Seni öldürürüm” diye yazan hesabı kınıyorum.", false],
];
