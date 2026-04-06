'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import DriverTable from '@/components/DriverTable';
import {
  createDriver,
  deleteDriver,
  getDrivers,
  resendDriverSetup,
  sendDriverPasswordReset,
  updateDriver,
  uploadFiles,
} from '@/lib/api';
import { getStoredToken, getStoredUser } from '@/lib/auth';
import {
  Driver,
  DriverAttachment,
  DriverMutationResponse,
  DriverPayload,
  DriverProfile,
} from '@/lib/types';

const emptyProfile: DriverProfile = {
  active: true,
  internalCode: '',
  dateOfBirth: '',
  nationality: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: '',
  notes: '',
  driverPhoto: null,
  licenseCopy: null,
  additionalDocuments: [],
  emergencyContact: {
    name: '',
    phone: '',
    relation: '',
  },
  vehicle: {
    make: '',
    model: '',
    color: '',
    year: '',
    plateNumber: '',
    vin: '',
    image: null,
    documents: [],
  },
};

const createEmptyForm = () => ({
  id: '',
  fullName: '',
  email: '',
  phone: '',
  driverProfile: {
    ...emptyProfile,
    emergencyContact: {
      ...emptyProfile.emergencyContact,
    },
    vehicle: {
      ...emptyProfile.vehicle,
      documents: [],
    },
    additionalDocuments: [],
  } as DriverProfile,
});

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [passwordActionLoading, setPasswordActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(createEmptyForm());
  const [currentRole, setCurrentRole] = useState<string>('');
  const [setupInfo, setSetupInfo] = useState<{
    mode: 'setup' | 'reset' | '';
    url: string;
  }>({
    mode: '',
    url: '',
  });

  const loadDrivers = async () => {
    const token = getStoredToken();

    if (!token) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    try {
      setError('');
      const data = await getDrivers(token);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err) {
      setDrivers([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Fahrer konnten nicht geladen werden.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    setCurrentRole(user?.role || '');
    void loadDrivers();
  }, []);

  const stats = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((item) => {
      if (typeof item.driverProfile?.active === 'boolean') {
        return item.driverProfile.active !== false;
      }

      return item.isActive !== false;
    }).length;
    const inactive = total - active;
    const withVehicle = drivers.filter(
      (item) =>
        item.driverProfile?.vehicle?.plateNumber ||
        item.driverProfile?.vehicle?.model
    ).length;
    const withLicense = drivers.filter(
      (item) => item.driverProfile?.licenseCopy?.url
    ).length;

    return { total, active, inactive, withVehicle, withLicense };
  }, [drivers]);

  const editingDriver = useMemo(
    () => drivers.find((item) => item._id === editingId) || null,
    [drivers, editingId]
  );

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId('');
    setError('');
    setSetupInfo({ mode: '', url: '' });
  };

  const startEdit = (driver: Driver) => {
    setEditingId(driver._id);
    setSuccess('');
    setError('');
    setSetupInfo({ mode: '', url: '' });

    setForm({
      id: driver._id,
      fullName: driver.fullName || driver.name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      driverProfile: {
        ...emptyProfile,
        ...(driver.driverProfile || {}),
        active:
          typeof driver.driverProfile?.active === 'boolean'
            ? driver.driverProfile.active
            : driver.isActive !== false,
        emergencyContact: {
          ...emptyProfile.emergencyContact,
          ...(driver.driverProfile?.emergencyContact || {}),
        },
        vehicle: {
          ...emptyProfile.vehicle,
          ...(driver.driverProfile?.vehicle || {}),
          documents: driver.driverProfile?.vehicle?.documents || [],
        },
        additionalDocuments: driver.driverProfile?.additionalDocuments || [],
      },
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setProfileValue = <K extends keyof DriverProfile>(
    field: K,
    value: DriverProfile[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      driverProfile: {
        ...prev.driverProfile,
        [field]: value,
      },
    }));
  };

  const setEmergencyField = (
    field: 'name' | 'phone' | 'relation',
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      driverProfile: {
        ...prev.driverProfile,
        emergencyContact: {
          ...prev.driverProfile.emergencyContact,
          [field]: value,
        },
      },
    }));
  };

  const setVehicleField = (
    field: 'make' | 'model' | 'color' | 'year' | 'plateNumber' | 'vin',
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      driverProfile: {
        ...prev.driverProfile,
        vehicle: {
          ...prev.driverProfile.vehicle,
          [field]: value,
        },
      },
    }));
  };

  const handleSingleUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    target: 'driverPhoto' | 'licenseCopy' | 'vehicleImage'
  ) => {
    const token = getStoredToken();
    const files = Array.from(event.target.files || []);

    if (!token || files.length === 0) return;

    try {
      setSaving(true);
      setError('');
      const uploaded = await uploadFiles(token, [files[0]]);
      const file = uploaded[0] || null;

      if (target === 'vehicleImage') {
        setForm((prev) => ({
          ...prev,
          driverProfile: {
            ...prev.driverProfile,
            vehicle: {
              ...prev.driverProfile.vehicle,
              image: file,
            },
          },
        }));
      } else {
        setProfileValue(target, file);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Datei konnte nicht hochgeladen werden.'
      );
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  };

  const handleMultiUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    target: 'additionalDocuments' | 'vehicleDocuments'
  ) => {
    const token = getStoredToken();
    const files = Array.from(event.target.files || []);

    if (!token || files.length === 0) return;

    try {
      setSaving(true);
      setError('');
      const uploaded = await uploadFiles(token, files);

      if (target === 'vehicleDocuments') {
        setForm((prev) => ({
          ...prev,
          driverProfile: {
            ...prev.driverProfile,
            vehicle: {
              ...prev.driverProfile.vehicle,
              documents: [
                ...(prev.driverProfile.vehicle?.documents || []),
                ...uploaded,
              ],
            },
          },
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          driverProfile: {
            ...prev.driverProfile,
            additionalDocuments: [
              ...(prev.driverProfile.additionalDocuments || []),
              ...uploaded,
            ],
          },
        }));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Dateien konnten nicht hochgeladen werden.'
      );
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (
    target:
      | 'driverPhoto'
      | 'licenseCopy'
      | 'vehicleImage'
      | 'additionalDocuments'
      | 'vehicleDocuments',
    index?: number
  ) => {
    if (target === 'driverPhoto' || target === 'licenseCopy') {
      setProfileValue(target, null);
      return;
    }

    if (target === 'vehicleImage') {
      setForm((prev) => ({
        ...prev,
        driverProfile: {
          ...prev.driverProfile,
          vehicle: {
            ...prev.driverProfile.vehicle,
            image: null,
          },
        },
      }));
      return;
    }

    if (target === 'additionalDocuments') {
      setForm((prev) => ({
        ...prev,
        driverProfile: {
          ...prev.driverProfile,
          additionalDocuments: (
            prev.driverProfile.additionalDocuments || []
          ).filter((_, i) => i !== index),
        },
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      driverProfile: {
        ...prev.driverProfile,
        vehicle: {
          ...prev.driverProfile.vehicle,
          documents: (prev.driverProfile.vehicle?.documents || []).filter(
            (_, i) => i !== index
          ),
        },
      },
    }));
  };

  const applyMutationResult = async (
    result: DriverMutationResponse,
    mode?: 'setup' | 'reset'
  ) => {
    const infoMode = mode || '';
    const infoUrl =
      infoMode === 'reset'
        ? result.resetUrl || ''
        : infoMode === 'setup'
          ? result.setupUrl || ''
          : '';

    resetForm();
    setSuccess(result.message || '');
    setSetupInfo({
      mode: infoMode,
      url: infoUrl,
    });

    await loadDrivers();
  };

  const handleSave = async () => {
    const token = getStoredToken();

    if (!token) {
      setError('Nicht eingeloggt.');
      return;
    }

    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Bitte Name, E-Mail und Telefonnummer ausfüllen.');
      return;
    }

    const payload: DriverPayload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      isActive: form.driverProfile.active !== false,
      driverProfile: form.driverProfile,
    };

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setSetupInfo({ mode: '', url: '' });

      if (editingId) {
        const updated = await updateDriver(token, editingId, payload);
        await applyMutationResult(updated);
      } else {
        const created = await createDriver(token, payload);
        await applyMutationResult(created, 'setup');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fahrer konnte nicht gespeichert werden.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResendSetup = async () => {
    const token = getStoredToken();

    if (!token || !editingId) {
      setError('Kein Fahrer für Einladungslink ausgewählt.');
      return;
    }

    try {
      setPasswordActionLoading('setup');
      setError('');
      setSuccess('');
      const result = await resendDriverSetup(token, editingId);

      setSetupInfo({
        mode: 'setup',
        url: result.setupUrl || '',
      });

      setSuccess(
        result.message || 'Einladungslink für Fahrer erneut vorbereitet.'
      );

      await loadDrivers();
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

    if (!token || !editingId) {
      setError('Kein Fahrer für Passwort-Reset ausgewählt.');
      return;
    }

    try {
      setPasswordActionLoading('reset');
      setError('');
      setSuccess('');
      const result = await sendDriverPasswordReset(token, editingId);

      setSetupInfo({
        mode: 'reset',
        url: result.resetUrl || '',
      });

      setSuccess(
        result.message || 'Passwort-Reset für Fahrer wurde vorbereitet.'
      );

      await loadDrivers();
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
      'Möchtest du diesen Fahrer wirklich löschen?'
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError('');
      setSuccess('');
      await deleteDriver(token, id);

      if (editingId === id) {
        resetForm();
      }

      await loadDrivers();
      setSuccess('Fahrer erfolgreich gelöscht.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Fahrer konnte nicht gelöscht werden.'
      );
    } finally {
      setDeletingId('');
    }
  };

  const renderAttachmentCard = (
    file: DriverAttachment | null | undefined,
    label: string,
    onRemove: () => void
  ) => {
    if (!file?.url) {
      return (
        <p className="text-sm text-muted">{label}: Noch nicht hochgeladen.</p>
      );
    }

    const isImage = file.mimeType?.startsWith('image/');

    return (
      <div className="rounded-2xl border border-border bg-background p-3">
        <p className="text-sm font-medium">{label}</p>

        {isImage ? (
          <img
            src={file.url}
            alt={file.name || label}
            className="mt-3 h-40 w-full rounded-2xl border border-border object-cover"
          />
        ) : (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-sm text-accent underline"
          >
            {file.name || 'Dokument öffnen'}
          </a>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="mt-3 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300 hover:bg-red-950/60"
        >
          Entfernen
        </button>
      </div>
    );
  };

  return (
    <AuthGuard allowedRoles={['admin', 'support']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">
              Fahrerverwaltung
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Fahrer</h2>
            <p className="mt-2 text-muted">
              Fahrer anlegen, bearbeiten, löschen und Dokumente zentral
              verwalten. Passwörter werden nicht vom Admin oder Support gesetzt.
              Fahrer legen ihr Passwort selbst per Einladungs- oder Reset-Link
              fest.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-slate-300">
            Angemeldete Rolle:{' '}
            <span className="font-semibold text-white">
              {currentRole || 'unbekannt'}
            </span>
          </div>

          {error ? <p className="mt-6 text-rose-300">{error}</p> : null}
          {success ? <p className="mt-6 text-emerald-300">{success}</p> : null}
          {saving ? (
            <p className="mt-4 text-sm text-muted">Speichervorgang läuft…</p>
          ) : null}
          {deletingId ? (
            <p className="mt-4 text-sm text-muted">Fahrer wird gelöscht…</p>
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

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Gesamt Fahrer" value={stats.total} />
            <StatCard label="Aktiv" value={stats.active} />
            <StatCard label="Inaktiv" value={stats.inactive} />
            <StatCard label="Mit Fahrzeugdaten" value={stats.withVehicle} />
            <StatCard label="Mit Führerschein" value={stats.withLicense} />
          </div>

          <section className="mt-10 rounded-3xl border border-border bg-surface p-6 shadow-premium">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingId ? 'Fahrer bearbeiten' : 'Neuen Fahrer anlegen'}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Alle wichtigen Fahrer-, Fahrzeug- und Dokumentendaten an einer
                  Stelle.
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
                Beim Anlegen eines neuen Fahrers wird kein Passwort gesetzt. Der
                Fahrer erhält bzw. benötigt anschließend einen Einladungslink,
                um sein Passwort selbst festzulegen.
              </div>
            ) : null}

            {editingId && editingDriver ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <h4 className="text-base font-semibold">
                    Passwort- und Einladungsstatus
                  </h4>

                  <div className="mt-3 space-y-2 text-sm text-muted">
                    <p>
                      Passwort gesetzt:{' '}
                      <span className="font-medium text-white">
                        {editingDriver.passwordSetAt ? 'Ja' : 'Nein'}
                      </span>
                    </p>
                    <p>
                      Passwort-Setup erforderlich:{' '}
                      <span className="font-medium text-white">
                        {editingDriver.passwordSetupRequired ? 'Ja' : 'Nein'}
                      </span>
                    </p>
                    <p>
                      Letzte Einladung:{' '}
                      <span className="font-medium text-white">
                        {editingDriver.invitedAt
                          ? new Date(editingDriver.invitedAt).toLocaleString(
                              'de-DE'
                            )
                          : 'Noch nicht'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <h4 className="text-base font-semibold">Aktionen</h4>
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

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Grunddaten</h4>

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

                <input
                  value={form.driverProfile.internalCode || ''}
                  onChange={(e) =>
                    setProfileValue('internalCode', e.target.value)
                  }
                  placeholder="Interner Fahrer-Code"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />

                <label className="flex items-center gap-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={form.driverProfile.active !== false}
                    onChange={(e) =>
                      setProfileValue('active', e.target.checked)
                    }
                  />
                  Fahrer aktiv
                </label>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Persönliche Daten</h4>

                <input
                  value={form.driverProfile.dateOfBirth || ''}
                  onChange={(e) =>
                    setProfileValue('dateOfBirth', e.target.value)
                  }
                  placeholder="Geburtsdatum"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />

                <input
                  value={form.driverProfile.nationality || ''}
                  onChange={(e) =>
                    setProfileValue('nationality', e.target.value)
                  }
                  placeholder="Nationalität"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />

                <input
                  value={form.driverProfile.addressLine1 || ''}
                  onChange={(e) =>
                    setProfileValue('addressLine1', e.target.value)
                  }
                  placeholder="Adresse Zeile 1"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />

                <input
                  value={form.driverProfile.addressLine2 || ''}
                  onChange={(e) =>
                    setProfileValue('addressLine2', e.target.value)
                  }
                  placeholder="Adresse Zeile 2"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    value={form.driverProfile.city || ''}
                    onChange={(e) => setProfileValue('city', e.target.value)}
                    placeholder="Stadt"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                  />
                  <input
                    value={form.driverProfile.postalCode || ''}
                    onChange={(e) =>
                      setProfileValue('postalCode', e.target.value)
                    }
                    placeholder="PLZ"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                  />
                  <input
                    value={form.driverProfile.country || ''}
                    onChange={(e) =>
                      setProfileValue('country', e.target.value)
                    }
                    placeholder="Land"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Notfallkontakt</h4>

                <input
                  value={form.driverProfile.emergencyContact?.name || ''}
                  onChange={(e) => setEmergencyField('name', e.target.value)}
                  placeholder="Name Notfallkontakt"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
                <input
                  value={form.driverProfile.emergencyContact?.phone || ''}
                  onChange={(e) => setEmergencyField('phone', e.target.value)}
                  placeholder="Telefon Notfallkontakt"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
                <input
                  value={form.driverProfile.emergencyContact?.relation || ''}
                  onChange={(e) =>
                    setEmergencyField('relation', e.target.value)
                  }
                  placeholder="Beziehung"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Notizen</h4>
                <textarea
                  value={form.driverProfile.notes || ''}
                  onChange={(e) => setProfileValue('notes', e.target.value)}
                  placeholder="Interne Notizen zum Fahrer"
                  rows={6}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <h4 className="text-lg font-medium">Fahrzeugdaten</h4>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <input
                  value={form.driverProfile.vehicle?.make || ''}
                  onChange={(e) => setVehicleField('make', e.target.value)}
                  placeholder="Marke"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
                <input
                  value={form.driverProfile.vehicle?.model || ''}
                  onChange={(e) => setVehicleField('model', e.target.value)}
                  placeholder="Modell"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
                <input
                  value={form.driverProfile.vehicle?.color || ''}
                  onChange={(e) => setVehicleField('color', e.target.value)}
                  placeholder="Farbe"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
                <input
                  value={form.driverProfile.vehicle?.year || ''}
                  onChange={(e) => setVehicleField('year', e.target.value)}
                  placeholder="Baujahr"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
                <input
                  value={form.driverProfile.vehicle?.plateNumber || ''}
                  onChange={(e) =>
                    setVehicleField('plateNumber', e.target.value)
                  }
                  placeholder="Kennzeichen"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
                <input
                  value={form.driverProfile.vehicle?.vin || ''}
                  onChange={(e) => setVehicleField('vin', e.target.value)}
                  placeholder="FIN / VIN"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="space-y-3">
                <h4 className="text-lg font-medium">Fahrerbild</h4>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleSingleUpload(e, 'driverPhoto')}
                />
                {renderAttachmentCard(
                  form.driverProfile.driverPhoto,
                  'Fahrerbild',
                  () => removeAttachment('driverPhoto')
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-medium">Führerscheinkopie</h4>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleSingleUpload(e, 'licenseCopy')}
                />
                {renderAttachmentCard(
                  form.driverProfile.licenseCopy,
                  'Führerschein',
                  () => removeAttachment('licenseCopy')
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-medium">Fahrzeugbild</h4>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleSingleUpload(e, 'vehicleImage')}
                />
                {renderAttachmentCard(
                  form.driverProfile.vehicle?.image,
                  'Fahrzeugbild',
                  () => removeAttachment('vehicleImage')
                )}
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-lg font-medium">
                  Weitere Fahrerdokumente
                </h4>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => handleMultiUpload(e, 'additionalDocuments')}
                />

                <div className="space-y-3">
                  {(form.driverProfile.additionalDocuments || []).length ===
                  0 ? (
                    <p className="text-sm text-muted">
                      Noch keine zusätzlichen Dokumente.
                    </p>
                  ) : (
                    (form.driverProfile.additionalDocuments || []).map(
                      (file, index) => (
                        <div
                          key={`${file.url}-${index}`}
                          className="rounded-2xl border border-border bg-background p-3"
                        >
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-accent underline"
                          >
                            {file.name || `Dokument ${index + 1}`}
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              removeAttachment('additionalDocuments', index)
                            }
                            className="mt-3 block rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300 hover:bg-red-950/60"
                          >
                            Entfernen
                          </button>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-medium">Fahrzeugdokumente</h4>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => handleMultiUpload(e, 'vehicleDocuments')}
                />

                <div className="space-y-3">
                  {(form.driverProfile.vehicle?.documents || []).length ===
                  0 ? (
                    <p className="text-sm text-muted">
                      Noch keine Fahrzeugdokumente.
                    </p>
                  ) : (
                    (form.driverProfile.vehicle?.documents || []).map(
                      (file, index) => (
                        <div
                          key={`${file.url}-${index}`}
                          className="rounded-2xl border border-border bg-background p-3"
                        >
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-accent underline"
                          >
                            {file.name || `Fahrzeugdokument ${index + 1}`}
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              removeAttachment('vehicleDocuments', index)
                            }
                            className="mt-3 block rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300 hover:bg-red-950/60"
                          >
                            Entfernen
                          </button>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-accent px-5 py-3 font-medium text-black hover:opacity-90 disabled:opacity-50"
              >
                {editingId ? 'Fahrer speichern' : 'Fahrer anlegen'}
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
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Vorhandene Fahrer</h3>
            </div>

            {loading ? (
              <p className="text-muted">Fahrer werden geladen…</p>
            ) : (
              <DriverTable
                drivers={drivers}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            )}
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}