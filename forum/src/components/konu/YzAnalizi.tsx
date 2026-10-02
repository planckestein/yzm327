import type { YzAnalizi as Analiz } from "@/lib/yz";
import { Badge } from "@/components/ui/badge";

/** YZ analizinin içeriği (diyalog içinde gösterilir). */
export function YzAnalizi({ a, acik }: { a: Analiz | null; acik: boolean }) {
  if (!a) return <p className="text-sm text-muted-foreground">Özet için tartışmada en az 3 mesaj olmalı.</p>;
  return (
    <div className="grid gap-5 text-sm">
      <div className="flex gap-6 text-muted-foreground">
        <span>
          <b className="text-foreground">{a.mesajSayisi}</b> mesaj
        </span>
        <span>
          <b className="text-foreground">{a.katilimci}</b> katılımcı
        </span>
        <span>
          <b className="text-success">{a.katilma}</b> katılma · <b className="text-destructive">{a.itiraz}</b> itiraz
        </span>
      </div>
      <section>
        <h3 className="mb-2 font-medium">Öne çıkan görüşler</h3>
        <ul className="grid gap-2">
          {a.oneCikanlar.map((o) => (
            <li key={o.cumle} className="rounded-md border-l-2 border-primary/40 bg-muted/50 px-3 py-2">
              “{o.cumle}” <span className="text-muted-foreground">— @{o.yazan}</span>
            </li>
          ))}
        </ul>
      </section>
      {a.kavramlar.length > 0 && (
        <section>
          <h3 className="mb-2 font-medium">Ortak kavramlar</h3>
          <div className="flex flex-wrap gap-1.5">
            {a.kavramlar.map((k) => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
        </section>
      )}
      {acik && (
        <section>
          <h3 className="mb-2 font-medium">Uzlaşma taslağı</h3>
          <p className="rounded-md border border-dashed p-3 text-muted-foreground italic">{a.uzlasmaTaslagi}</p>
          <p className="mt-1 text-xs text-muted-foreground">Düzenleyip “Uzlaşma öner” ile oylamaya sunabilirsin.</p>
        </section>
      )}
    </div>
  );
}
