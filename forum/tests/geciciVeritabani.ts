import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/*
 * Testi boş bir geçici klasörde çalıştırır: veritabanına dokunan her test dosyası bunu İLK import olarak yükler.
 * db.ts veri klasörünü bağlantı açılırken belirlediği için açılan veritabanı, gerçek veri/forum.db değil,
 * geçici klasördeki yeni bir dosyadır.
 */
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "kurultay-test-")));

