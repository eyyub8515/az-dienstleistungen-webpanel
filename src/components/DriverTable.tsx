'use client';

import { Driver } from '@/lib/types';

type DriverTableProps = {
  drivers: Driver[];
  onEdit: (driver: Driver) => void;
  onDelete: (id: string) => void;
};

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('de-DE');
}

export default function DriverTable({
  drivers,
  onEdit,
  onDelete,
}: DriverTableProps) {
  const safeDrivers = Array.isArray(drivers) ? drivers : [];

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-white/5 text-left text-muted">
          <tr>
            <th className="px-5 py-4 font-medium">Fahrer</th>
            <th className="px-5 py-4 font-medium">Kontakt</th>
            <th className="px-5 py-4 font-medium">Status</th>
            <th className="px-5 py-4 font-medium">Zugang</th>
            <th className="px-5 py-4 font-medium">Fahrzeug</th>
            <th className="px-5 py-4 font-medium">Dokumente</th>
            <th className="px-5 py-4 font-medium text-right">Aktionen</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {safeDrivers.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-10 text-center text-sm text-muted"
              >
                Noch keine Fahrer vorhanden.
              </td>
            </tr>
          ) : (
            safeDrivers.map((driver) => {
              const profile = driver.driverProfile || {};
              const vehicle = profile.vehicle || {};

              const docsCount =
                Number(Boolean(profile.licenseCopy?.url)) +
                Number(Boolean(profile.driverPhoto?.url)) +
                Number(Boolean(vehicle.image?.url)) +
                Number(
                  Array.isArray(vehicle.documents)
                    ? vehicle.documents.filter((item) => item?.url).length
                    : 0
                ) +
                Number(
                  Array.isArray(profile.additionalDocuments)
                    ? profile.additionalDocuments.filter((item) => item?.url).length
                    : 0
                );

              const driverName =
                driver.fullName || driver.name || 'Unbekannter Fahrer';

              const vehicleLabel =
                [vehicle.make, vehicle.model, vehicle.plateNumber]
                  .filter(Boolean)
                  .join(' · ') || '—';

              const isActive =
                profile.active !== undefined
                  ? profile.active !== false
                  : driver.isActive !== false;

              const passwordReady = Boolean(driver.passwordSetAt);
              const setupRequired = Boolean(driver.passwordSetupRequired);

              return (
                <tr key={driver._id} className="hover:bg-white/[0.03]">
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-start gap-3">
                      {profile.driverPhoto?.url ? (
                        <img
                          src={profile.driverPhoto.url}
                          alt={driverName}
                          className="h-12 w-12 rounded-2xl border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-xs text-muted">
                          —
                        </div>
                      )}

                      <div>
                        <div className="font-medium text-white">
                          {driverName}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {profile.internalCode || 'Kein Code'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="font-medium text-white">
                      {driver.email || '—'}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {driver.phone || '—'}
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex rounded-xl px-3 py-2 text-xs font-medium ${
                        isActive
                          ? 'border border-emerald-800 bg-emerald-950/40 text-emerald-300'
                          : 'border border-amber-800 bg-amber-950/40 text-amber-300'
                      }`}
                    >
                      {isActive ? 'Aktiv' : 'Inaktiv'}
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
                        {passwordReady ? 'Passwort gesetzt' : 'Setup offen'}
                      </span>

                      <div className="text-xs text-muted">
                        <div>
                          Einladung:{' '}
                          <span className="text-slate-300">
                            {driver.invitedAt
                              ? formatDate(driver.invitedAt)
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

                  <td className="px-5 py-4 align-top text-muted">
                    {vehicleLabel}
                  </td>

                  <td className="px-5 py-4 align-top text-muted">
                    {docsCount}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(driver)}
                        className="rounded-xl border border-border px-3 py-2 hover:bg-white/5"
                      >
                        Bearbeiten
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(driver._id)}
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
  );
}