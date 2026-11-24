import type { Metadata } from "next";
import { BriefErfassen, ZurueckLink } from "@/components/brief/BriefErfassen";

export const metadata: Metadata = {
  title: "Brief hinzufügen – Post-Assistent",
};

export default function BriefHinzufuegenSeite() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <nav className="mb-3">
        <ZurueckLink />
      </nav>
      <BriefErfassen />
    </div>
  );
}
