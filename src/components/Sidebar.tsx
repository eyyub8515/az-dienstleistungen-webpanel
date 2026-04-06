'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Truck,
  CircleDollarSign,
  LogOut,
  Users,
} from 'lucide-react';
import { clearAuth, getStoredUser } from '@/lib/auth';

function isAdmin(role?: string) {
  return role === 'admin';
}

const baseItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests', label: 'Aufträge', icon: Briefcase },
  { href: '/price-inquiries', label: 'Preisabfragen', icon: CircleDollarSign },
  { href: '/drivers', label: 'Fahrer', icon: Truck },
];

const adminOnlyItems = [{ href: '/staff', label: 'Mitarbeiter', icon: Users }];

function getVisibleAccountTitle() {
  return 'AZ Dienstleistungen';
}

function getVisibleAccessLabel(role?: string) {
  if (role === 'support') {
    return 'Support-Zugang';
  }

  return 'Systemzugang';
}

function getVisibleAccessDescription(role?: string) {
  if (role === 'support') {
    return 'Zugriff auf Fahrer, Aufträge und Preisabfragen entsprechend der freigeschalteten Rechte.';
  }

  return 'Interner Hauptzugang für Systemsteuerung, Mitarbeiterverwaltung, Fahrer, Aufträge und Preisabfragen.';
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();

  const navigationItems = [
    ...baseItems,
    ...(isAdmin(user?.role) ? adminOnlyItems : []),
  ];

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <aside className="sticky top-0 flex h-screen w-76 shrink-0 flex-col border-r border-border bg-surface/85 px-6 py-7 backdrop-blur-xl">
      <div>
        <p className="text-[11px] uppercase tracking-[0.35em] text-accent">
          AZ Dienstleistungen
        </p>

        <h1 className="mt-3 text-2xl font-semibold text-white">
          Support Panel
        </h1>

        <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
          Internes Steuerzentrum für diskrete Premium-Anfragen,
          Fahrerkoordination, Mitarbeiterverwaltung und Preisabfragen.
        </p>
      </div>

      <nav className="mt-10 space-y-2">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={[
                'group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'border-accent/25 bg-accent/10 text-white shadow-[0_14px_34px_rgba(212,175,55,0.12)]'
                  : 'border-transparent text-slate-200 hover:border-border hover:bg-white/[0.04] hover:text-white',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200',
                  active
                    ? 'border-accent/30 bg-accent text-black'
                    : 'border-border bg-background text-slate-300 group-hover:text-white',
                ].join(' ')}
              >
                <Icon size={17} />
              </span>

              <div className="min-w-0">
                <span className="block truncate">{label}</span>
                {active ? (
                  <span className="mt-0.5 block text-[11px] text-white/65">
                    Aktiver Bereich
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-border bg-background/90 p-4 shadow-premium">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">
            {getVisibleAccountTitle()}
          </p>

          <p className="mt-1 break-all text-xs text-muted">
            {user?.email || 'support@az-dienstleistungen.com'}
          </p>

          <div className="mt-4 rounded-2xl border border-border bg-background px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
              {getVisibleAccessLabel(user?.role)}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              {getVisibleAccessDescription(user?.role)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-3 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={16} />
            Abmelden
          </button>
        </div>
      </div>
    </aside>
  );
}
