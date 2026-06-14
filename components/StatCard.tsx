export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
