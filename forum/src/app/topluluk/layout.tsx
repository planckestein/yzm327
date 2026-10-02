import { SayfaBasligi } from "@/components/ortak/SayfaBasligi";
import { ToplulukSekmeleri } from "./Sekmeler";

export default function ToplulukDuzeni({ children }: LayoutProps<"/topluluk">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <SayfaBasligi ust="Topluluk" baslik="Kim kimdir?">
        Platformu kimler yönetiyor, kimler birbiriyle konuşuyor ve her şeyin silinmez kaydı.
      </SayfaBasligi>
      <ToplulukSekmeleri />
      {children}
    </div>
  );
}
