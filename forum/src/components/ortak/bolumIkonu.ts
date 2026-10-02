import { Building2, Coins, Cpu, GraduationCap, HeartPulse, Leaf, Megaphone, Newspaper, Scale, Shield, Tag, Users } from "lucide-react";

const IKONLAR: Record<string, typeof Scale> = {
  "Anayasa ve Hukuk": Scale,
  "İfade Özgürlüğü ve Basın": Megaphone,
  "Ekonomi ve Çalışma Hayatı": Coins,
  "Eğitim": GraduationCap,
  "Sağlık": HeartPulse,
  "Çevre ve Enerji": Leaf,
  "Dijital Haklar ve Teknoloji": Cpu,
  "Şehirler ve Ulaşım": Building2,
  "Güvenlik ve Göç": Shield,
  "Aile ve Toplum": Users,
  "Ortak Akıl Hakkında": Newspaper,
};

/** Ana bölüm adına göre ikon */
export function bolumIkonu(anaBolumAd: string) {
  return IKONLAR[anaBolumAd] ?? Tag;
}
