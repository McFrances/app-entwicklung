const MAX_KANTE = 2000; // Pixel an der längsten Seite – reicht, damit Text gut lesbar bleibt
const JPEG_QUALITAET = 0.85;

/**
 * Verkleinert Handyfotos vor dem Hochladen (oft 4–12 MB) auf eine handliche Größe.
 * PDFs und Bilder, die der Browser nicht lesen kann, bleiben unverändert.
 */
export async function bildVerkleinern(datei: File): Promise<File> {
  if (!datei.type.startsWith("image/") || datei.type === "image/gif") return datei;

  let bild: ImageBitmap;
  try {
    bild = await createImageBitmap(datei);
  } catch {
    return datei;
  }

  const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
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
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITAET),
  );
  // Nicht verkleinert und nicht kleiner geworden: Original behalten
  if (!blob || (faktor === 1 && blob.size >= datei.size)) return datei;
  const name = datei.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
