'use client';

import { useEffect, useMemo, useState } from 'react';
import { RequestStatus } from '@/lib/types';
import { getStoredToken } from '@/lib/auth';
import { updateRequestStatus } from '@/lib/api';

const statuses: { value: RequestStatus; label: string }[] = [
  { value: 'received', label: 'Eingegangen' },
  { value: 'accepted', label: 'Akzeptiert' },
  { value: 'inProgress', label: 'In Bearbeitung' },
  { value: 'waitingForClient', label: 'Wartet auf Kunde' },
  { value: 'done', label: 'Erledigt' },
  { value: 'canceled', label: 'Storniert' },
  { value: 'rejected', label: 'Abgelehnt' },
];

type Props = {
  requestId: string;
  currentStatus: RequestStatus;
  onUpdated?: () => Promise<void> | void;
};

function getStatusTone(status: RequestStatus) {
  switch (status) {
    case 'received':
      return 'border-violet-500/25 bg-violet-500/10 text-violet-200';
    case 'accepted':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
    case 'inProgress':
      return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
    case 'waitingForClient':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
    case 'done':
      return 'border-green-500/25 bg-green-500/10 text-green-200';
    case 'canceled':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
    case 'rejected':
      return 'border-red-500/25 bg-red-500/10 text-red-200';
    default:
      return 'border-border bg-white/5 text-slate-200';
  }
}

function getStatusLabel(status: RequestStatus) {
  return (
    statuses.find((item) => item.value === status)?.label || status || 'Unbekannt'
  );
}

export default function StatusUpdateForm({
  requestId,
  currentStatus,
  onUpdated,
}: Props) {
  const [status, setStatus] = useState<RequestStatus>(currentStatus);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const selectedStatusLabel = useMemo(() => getStatusLabel(status), [status]);
  const currentStatusLabel = useMemo(
    () => getStatusLabel(currentStatus),
    [currentStatus]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = getStoredToken();
    if (!token) {
      setError('Keine gültige Sitzung gefunden.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await updateRequestStatus(token, requestId, status, note || undefined);
      setNote('');
      setSuccess('Status erfolgreich aktualisiert.');

      if (onUpdated) {
        await onUpdated();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Status konnte nicht aktualisiert werden.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-border bg-surface p-6 shadow-premium"
    >
      <p className="text-sm uppercase tracking-[0.24em] text-accent">
        Status
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white">Status ändern</h3>
      <p className="mt-2 text-sm leading-6 text-muted">
        Aktuellen Bearbeitungsstand sauber dokumentieren und bei Bedarf eine
        interne Notiz hinterlegen.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Aktueller Status
          </p>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(
                currentStatus
              )}`}
            >
              {currentStatusLabel}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Gewählter neuer Status
          </p>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(
                status
              )}`}
            >
              {selectedStatusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-muted">Neuer Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RequestStatus)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-muted">Interne Notiz</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-32 w-full rounded-2xl border border-border bg-background px-4 py-3"
            placeholder="Optionaler Hinweis zur Statusänderung"
          />
          <p className="mt-2 text-xs leading-6 text-muted">
            Die Notiz erscheint in der Historie des Auftrags und hilft bei der
            internen Nachverfolgung.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-accent px-5 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Wird gespeichert…' : 'Status speichern'}
        </button>
      </div>
    </form>
  );
}
