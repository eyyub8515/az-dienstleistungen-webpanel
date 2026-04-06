type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
};

export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-premium">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}