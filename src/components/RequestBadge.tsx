import { RequestSignal, RequestStatus } from '@/lib/types';

const statusClasses: Record<RequestStatus, string> = {
  received: 'border border-violet-500/25 bg-violet-500/10 text-violet-200',
  accepted: 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  inProgress: 'border border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
  done: 'border border-green-500/25 bg-green-500/10 text-green-200',
  canceled: 'border border-zinc-500/25 bg-zinc-500/10 text-zinc-200',
  rejected: 'border border-rose-500/25 bg-rose-500/10 text-rose-200',
  waitingForClient: 'border border-amber-500/25 bg-amber-500/10 text-amber-200',
};

const statusLabels: Record<RequestStatus, string> = {
  received: 'Neu eingegangen',
  accepted: 'Akzeptiert',
  inProgress: 'In Bearbeitung',
  done: 'Erledigt',
  canceled: 'Storniert',
  rejected: 'Abgelehnt',
  waitingForClient: 'Warten auf Kunde',
};

const signalClasses: Record<RequestSignal, string> = {
  Urgent: 'border border-rose-500/25 bg-rose-500/10 text-rose-200',
  Discreet: 'border border-sky-500/25 bg-sky-500/10 text-sky-200',
  Later: 'border border-amber-500/25 bg-amber-500/10 text-amber-200',
};

const signalLabels: Record<RequestSignal, string> = {
  Urgent: 'Dringend',
  Discreet: 'Diskret',
  Later: 'Später',
};

type BadgeProps = {
  className: string;
  label: string;
};

function PremiumBadge({ className, label }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-[0.01em] ${className}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <PremiumBadge
      className={statusClasses[status]}
      label={statusLabels[status]}
    />
  );
}

export function SignalBadge({ signal }: { signal: RequestSignal }) {
  return (
    <PremiumBadge
      className={signalClasses[signal]}
      label={signalLabels[signal]}
    />
  );
}
