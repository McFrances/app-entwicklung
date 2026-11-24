export type Stufe = { maxKante: number; qualitaet: number };

/** Standard beim Hinzufügen: Text bleibt gut lesbar, Handyfotos (4–12 MB) werden handlich. */
export const STANDARD_STUFE: Stufe = { maxKante: 2000, qualitaet: 0.85 };

/** Immer stärkere Verkleinerung, falls alle Seiten zusammen zu groß für den Upload sind. */
const STUFEN: Stufe[] = [
  STANDARD_STUFE,
  { maxKante: 1600, qualitaet: 0.75 },
  { maxKante: 1400, qualitaet: 0.65 },
  { maxKante: 1200, qualitaet: 0.55 },
  { maxKante: 1000, qualitaet: 0.5 },
];

/**
 * Verkleinert ein Foto auf die gegebene Stufe (als JPEG).
 * PDFs und Bilder, die der Browser nicht lesen kann, bleiben unverändert.
 */
export async function bildVerkleinern(datei: File, stufe: Stufe = STANDARD_STUFE): Promise<File> {
  if (!datei.type.startsWith("image/") || datei.type === "image/gif") return datei;

  let bild: ImageBitmap;
  try {
    bild = await createImageBitmap(datei);
  } catch {
    return datei;
  }

  const faktor = Math.min(1, stufe.maxKante / Math.max(bild.width, bild.height));
  const breite = Math.round(bild.width * faktor);
  const hoehe = Math.round(bild.height * faktor);

  const canvas = document.createElement("canvas");
  canvas.width = breite;
  canvas.height = hoehe;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bild.close();
    return datei;
  }
  ctx.drawImage(bild, 0, 0, breite, hoehe);
  bild.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", stufe.qualitaet),
  );
  // Nicht verkleinert und nicht kleiner geworden: Original behalten
  if (!blob || (faktor === 1 && blob.size >= datei.size)) return datei;
  const name = datei.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

/**
 * Bringt alle Seiten unter die Größengrenze, indem die Fotos stufenweise stärker
 * verkleinert werden (immer vom Original aus). Gibt null zurück, wenn es auch auf der
 * stärksten Stufe nicht reicht, z. B. bei einer großen PDF.
 */
export async function aufGroesseBringen(originale: File[], grenze: number): Promise<File[] | null> {
  for (const stufe of STUFEN) {
    const verkleinert = await Promise.all(originale.map((datei) => bildVerkleinern(datei, stufe)));
    const gesamt = verkleinert.reduce((summe, datei) => summe + datei.size, 0);
    if (gesamt <= grenze) return verkleinert;
  }
  return null;
}
