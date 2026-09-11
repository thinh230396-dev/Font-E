/**
 * Ô số liệu ở đầu bàn lễ tân: một biểu tượng, một con số, một dòng chú thích.
 *
 * Tách khỏi `ReceptionistPortal.tsx` ngày 27 — đây là component đầu tiên rời khỏi file ấy, và
 * nó rời được vì không đọc gì ngoài props.
 */

import type { CalendarDays } from 'lucide-react';

export default function MetricCard({ icon: Icon, label, value, note, tone }: { icon: typeof CalendarDays; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-brand-outline bg-brand-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-extrabold uppercase tracking-[0.1em] text-brand-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-brand-text">{value}</p>
          <p className="mt-1 text-body text-brand-text-muted">{note}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}
