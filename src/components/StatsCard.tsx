interface StatsCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export default function StatsCard({ label, value, highlight }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-outline-subtle bg-surface-container-high/80 px-4 py-4">
      <span className={`font-mono text-[24px] font-medium tracking-tight leading-none ${highlight ? 'text-secondary' : 'text-primary'}`}>
        {value}
      </span>
      <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-on-surface-muted select-none">{label}</div>
    </div>
  );
}
