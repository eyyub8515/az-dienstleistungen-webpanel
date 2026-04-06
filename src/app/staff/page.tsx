'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import {
  createStaff,
  deleteStaff,
  getStaff,
  resendStaffSetup,
  sendStaffPasswordReset,
  updateStaff,
} from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import { StaffPayload, User } from '@/lib/types';

type StaffRole = StaffPayload['role'];

type StaffUser = User;

type StaffFormState = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  isActive: boolean;
};

const emptyForm: StaffFormState = {
  id: '',
  fullName: '',
  email: '',
  phone: '',
  role: 'support',
  isActive: true,
};

function getRoleLabel(role?: string) {
  switch (role) {
    case 'support':
      return 'Support';
    case 'admin':
      return 'System';
    default:
      return 'Unbekannt';
  }
}

function getRoleBadgeClass(role?: string) {
  switch (role) {
    case 'support':
      return 'border border-sky-800 bg-sky-950/40 text-sky-300';
    case 'admin':
      return 'border border-slate-700 bg-slate-900/60 text-slate-200';
    default:
      return 'border border-border bg-background text-slate-300';
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('de-DE');
}

function canUseSelfPasswordFlow(role?: StaffRole) {
  return role === 'support';
}

function isVisibleStaffRow(user: StaffUser) {
  return user.role === 'support';
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'support'>('all');
  const [passwordActionLoading, setPasswordActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [setupInfo, setSetupInfo] = useState<{
    mode: 'setup' | 'reset' | '';
    url: string;
  }>({
    mode: '',
    url: '',
  });

  const loadStaff = async () => {
    const token = getStoredToken();

    if (!token) {
      setStaff([]);
      setLoading(false);
      return;
    }

    try {
      setError('');

      const data = await getStaff(token);
      const safeData = Array.isArray(data) ? (data as StaffUser[]) : [];

      const visibleRows = safeData.filter(isVisibleStaffRow);
      const filteredRows =
        filterRole === 'support'
          ? visibleRows.filter((item) => item.role === 'support')
          : visibleRows;

      setStaff(filteredRows);
    } catch (err) {
      setStaff([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Mitarbeiter konnten nicht geladen werden.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadStaff();
  }, [filterRole]);

  const stats = useMemo(() => {
    const total = staff.length;
    const support = staff.filter((item) => item.role === 'support').length;
    const active = staff.filter((item) => item.isActive !== false).length;

    return {
      total,
      support,
      active,
    };
  }, [staff]);

  const editingUser = useMemo(
    () => staff.find((item) => item._id === editingId) || null,
    [staff, editingId]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
    setError('');
    setSetupInfo({ mode: '', url: '' });
  };

  const startEdit = (user: StaffUser) => {
    setEditingId(user._id);
    setSuccess('');
    setError('');
    setSetupInfo({ mode: '', url: '' });

    setForm({
      id: user._id,
      fullName: user.fullName || user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role === 'support' ? 'support' : 'support',
      isActive: user.isActive !== false,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    const token = getStoredToken();

    if (!token) {
      setError('Nicht eingeloggt.');
      return;
    }

    if (!form.fullName.trim() || !form.email.trim()) {
      setError('Bitte Name und E-Mail ausfüllen.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setSetupInfo({ mode: '', url: '' });

      const payload: StaffPayload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: 'support',
        isActive: form.isActive,
      };

      if (editingId) {
        await updateStaff(token, editingId, payload);
        setSuccess('Mitarbeiter erfolgreich aktualisiert.');
      } else {
        const created = await createStaff(token, payload);

        setSetupInfo({
          mode: 'setup',
          url: created?.passwordSetupRequired ? '' : '',
        });

        setSuccess(
          'Mitarbeiter erfolgreich erstellt. Der Mitarbeiter muss sein Passwort selbst über den Einladungslink festlegen.'
        );
      }

      resetForm();
      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Mitarbeiter konnte nicht gespeichert werden.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResendSetup = async () => {
    const token = getStoredToken();

    if (!token || !editingId || !editingUser) {
      setError('Kein Mitarbeiter für Einladungslink ausgewählt.');
      return;
    }

    if (!canUseSelfPasswordFlow(editingUser.role as StaffRole)) {
      setError('Einladungslinks sind nur für Support-Konten vorgesehen.');
      return;
    }

    try {
      setPasswordActionLoading('setup');
      setError('');
      setSuccess('');

      const result = await resendStaffSetup(token, editingId);

      setSetupInfo({
        mode: 'setup',
        url: result.setupUrl || '',
      });

      setSuccess(
        result.message || 'Einladungslink für Mitarbeiter erneut vorbereitet.'
      );

      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Einladungslink konnte nicht vorbereitet werden.'
      );
    } finally {
      setPasswordActionLoading('');
    }
  };

  const handleSendPasswordReset = async () => {
    const token = getStoredToken();

    if (!token || !editingId || !editingUser) {
      setError('Kein Mitarbeiter für Passwort-Reset ausgewählt.');
      return;
    }

    if (!canUseSelfPasswordFlow(editingUser.role as StaffRole)) {
      setError(
        'Passwort-Reset über diesen Flow ist nur für Support-Konten vorgesehen.'
      );
      return;
    }

    try {
      setPasswordActionLoading('reset');
      setError('');
      setSuccess('');

      const result = await sendStaffPasswordReset(token, editingId);

      setSetupInfo({
        mode: 'reset',
        url: result.resetUrl || '',
      });

      setSuccess(
        result.message || 'Passwort-Reset für Mitarbeiter wurde vorbereitet.'
      );

      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Passwort-Reset konnte nicht vorbereitet werden.'
      );
    } finally {
      setPasswordActionLoading('');
    }
  };

  const handleDelete = async (id: string) => {
    const token = getStoredToken();

    if (!token) {
      setError('Nicht eingeloggt.');
      return;
    }

    const confirmed = window.confirm(
      'Möchtest du diesen Mitarbeiter wirklich löschen?'
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError('');
      setSuccess('');

      await deleteStaff(token, id);

      if (editingId === id) {
        resetForm();
      }

      await loadStaff();
      setSuccess('Mitarbeiter erfolgreich gelöscht.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Mitarbeiter konnte nicht gelöscht werden.'
      );
    } finally {
      setDeletingId('');
    }
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">
              Mitarbeiterverwaltung
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Mitarbeiter
            </h2>
            <p className="mt-2 text-muted">
              Interne Konten für das Support Panel zentral anlegen, bearbeiten
              und löschen. Passwörter werden nicht direkt gesetzt. Mitarbeiter
              legen ihr Passwort selbst per Einladungs- oder Reset-Link fest.
            </p>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          ) : null}

          {saving ? (
            <p className="mt-4 text-sm text-muted">Speichervorgang läuft…</p>
          ) : null}

          {deletingId ? (
            <p className="mt-4 text-sm text-muted">
              Mitarbeiter wird gelöscht…
            </p>
          ) : null}

          {passwordActionLoading ? (
            <p className="mt-4 text-sm text-muted">
              Passwort-Aktion wird vorbereitet…
            </p>
          ) : null}

          {setupInfo.url ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-medium">
                {setupInfo.mode === 'setup'
                  ? 'Einladungslink vorbereitet'
                  : 'Passwort-Reset-Link vorbereitet'}
              </p>
              <p className="mt-2 break-all">{setupInfo.url}</p>
              <p className="mt-2 text-xs text-amber-200/80">
                Dieser Link wird vor allem in der lokalen Entwicklung angezeigt.
                In Produktion sollte er per E-Mail versendet werden.
              </p>
            </div>
          ) : null}

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Gesamt Mitarbeiter" value={stats.total} />
            <StatCard label="Support" value={stats.support} />
            <StatCard label="Aktiv" value={stats.active} />
          </div>

          <section className="mt-10 rounded-3xl border border-border bg-surface p-6 shadow-premium">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {editingId
                    ? 'Mitarbeiter bearbeiten'
                    : 'Neuen Mitarbeiter anlegen'}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Hier werden interne Konten für das Support Panel und interne
                  Abläufe verwaltet.
                </p>
              </div>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-white/5"
                >
                  Bearbeitung abbrechen
                </button>
              ) : null}
            </div>

            {!editingId ? (
              <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                Mitarbeiter-Konten werden ohne Passwort angelegt. Die Benutzer
                setzen ihr Passwort selbst über einen Einladungslink.
                Passwörter werden nicht direkt verwaltet.
              </div>
            ) : null}

            {editingId && editingUser ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <h4 className="text-base font-semibold text-white">
                    Passwort- und Einladungsstatus
                  </h4>

                  <div className="mt-3 space-y-2 text-sm text-muted">
                    <p>
                      Rolle:{' '}
                      <span className="font-medium text-white">
                        {getRoleLabel(editingUser.role)}
                      </span>
                    </p>
                    <p>
                      Passwort gesetzt:{' '}
                      <span className="font-medium text-white">
                        {editingUser.passwordSetAt ? 'Ja' : 'Nein'}
                      </span>
                    </p>
                    <p>
                      Passwort-Setup erforderlich:{' '}
                      <span className="font-medium text-white">
                        {editingUser.passwordSetupRequired ? 'Ja' : 'Nein'}
                      </span>
                    </p>
                    <p>
                      Letzte Einladung:{' '}
                      <span className="font-medium text-white">
                        {editingUser.invitedAt
                          ? formatDate(editingUser.invitedAt)
                          : 'Noch nicht'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <h4 className="text-base font-semibold text-white">
                    Aktionen
                  </h4>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleResendSetup}
                      disabled={passwordActionLoading === 'setup'}
                      className="rounded-2xl border border-border px-4 py-3 text-sm hover:bg-white/5 disabled:opacity-50"
                    >
                      Einladungslink erneut senden
                    </button>

                    <button
                      type="button"
                      onClick={handleSendPasswordReset}
                      disabled={passwordActionLoading === 'reset'}
                      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Passwort-Reset senden
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <input
                value={form.fullName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder="Vollständiger Name"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
              />

              <input
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="E-Mail"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
              />

              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="Telefonnummer"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
              />

              <div className="flex items-center rounded-2xl border border-border bg-background px-4 py-3 text-sm text-white">
                Support
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted lg:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Mitarbeiter aktiv
              </label>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-accent px-5 py-3 font-medium text-black hover:opacity-90 disabled:opacity-50"
              >
                {editingId
                  ? 'Mitarbeiter speichern'
                  : 'Mitarbeiter anlegen'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-border px-5 py-3 hover:bg-white/5"
              >
                Formular zurücksetzen
              </button>
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-white">
                Vorhandene Mitarbeiter
              </h3>

              <select
                value={filterRole}
                onChange={(e) =>
                  setFilterRole(e.target.value as 'all' | 'support')
                }
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none"
              >
                <option value="all">Alle Rollen</option>
                <option value="support">Nur Support</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-white/5 text-left text-muted">
                  <tr>
                    <th className="px-5 py-4 font-medium">Mitarbeiter</th>
                    <th className="px-5 py-4 font-medium">Kontakt</th>
                    <th className="px-5 py-4 font-medium">Rolle</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Zugang</th>
                    <th className="px-5 py-4 font-medium text-right">
                      Aktionen
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-muted"
                      >
                        Mitarbeiter werden geladen…
                      </td>
                    </tr>
                  ) : staff.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-muted"
                      >
                        Noch keine Mitarbeiter vorhanden.
                      </td>
                    </tr>
                  ) : (
                    staff.map((user) => {
                      const displayName =
                        user.fullName || user.name || 'Unbekannter Benutzer';

                      const passwordReady = Boolean(user.passwordSetAt);
                      const setupRequired = Boolean(user.passwordSetupRequired);

                      return (
                        <tr key={user._id} className="hover:bg-white/[0.03]">
                          <td className="px-5 py-4 align-top">
                            <div>
                              <div className="font-medium text-white">
                                {displayName}
                              </div>
                              <div className="mt-1 text-xs text-muted">
                                ID: {user._id}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="font-medium text-white">
                              {user.email || '—'}
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              {user.phone || '—'}
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span
                              className={`inline-flex rounded-xl px-3 py-2 text-xs font-medium ${getRoleBadgeClass(
                                user.role
                              )}`}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span
                              className={`inline-flex rounded-xl px-3 py-2 text-xs font-medium ${
                                user.isActive !== false
                                  ? 'border border-emerald-800 bg-emerald-950/40 text-emerald-300'
                                  : 'border border-amber-800 bg-amber-950/40 text-amber-300'
                              }`}
                            >
                              {user.isActive !== false ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="space-y-2">
                              <span
                                className={`inline-flex rounded-xl px-3 py-2 text-xs font-medium ${
                                  passwordReady
                                    ? 'border border-emerald-800 bg-emerald-950/40 text-emerald-300'
                                    : 'border border-blue-800 bg-blue-950/40 text-blue-300'
                                }`}
                              >
                                {passwordReady
                                  ? 'Passwort gesetzt'
                                  : 'Setup offen'}
                              </span>

                              <div className="text-xs text-muted">
                                <div>
                                  Einladung:{' '}
                                  <span className="text-slate-300">
                                    {user.invitedAt
                                      ? formatDate(user.invitedAt)
                                      : 'Noch nicht'}
                                  </span>
                                </div>

                                <div className="mt-1">
                                  Aktion nötig:{' '}
                                  <span className="text-slate-300">
                                    {setupRequired ? 'Ja' : 'Nein'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(user)}
                                className="rounded-xl border border-border px-3 py-2 hover:bg-white/5"
                              >
                                Bearbeiten
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(user._id)}
                                className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-red-300 hover:bg-red-950/60"
                              >
                                Löschen
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}