import { STATUS_KLASSEN, STATUS_TEXT, type Status } from "@/lib/vorgang";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_KLASSEN[status]}`}>
      {STATUS_TEXT[status]}
    </span>
  );
}
