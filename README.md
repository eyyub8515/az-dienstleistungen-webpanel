# AZ Dienstleistungen – Admin-Webpanel

Next.js Admin-/Operator-Webpanel für das bestehende AZ-Dienstleistungen-Backend.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- direkte API-Anbindung an dein Express/MongoDB-Backend

## Enthalten
- Login für `admin` und `operator`
- Dashboard mit KPI-Karten
- Auftragsliste mit Suche und Filtern
- Auftragsdetailseite
- Statusänderung mit interner Notiz
- dunkles Premium-UI

## Backend-Voraussetzung
Das Backend muss laufen und die folgenden Routen bereitstellen:
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/requests`
- `GET /api/requests/:id`
- `PATCH /api/requests/:id/status`
- `GET /api/requests/stats/overview`

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

## API URL setzen
In `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Demo-Logins nach Seed
- `admin@azdienstleistungen.de / Admin123!`
- `operator@azdienstleistungen.de / Operator123!`

## Hinweis zur Architektur
Dieses Panel ist als realistischer Startpunkt gebaut. Für die nächste Ausbauphase empfehle ich:
1. serverseitige Auth mit HttpOnly Cookies
2. echtes Rollen-/Rechtesystem
3. Paginierung und Sortierung im Backend
4. Upload-Ansicht für Anhänge
5. Live-Updates mit Socket.IO


## Anhänge

Auf der Auftragsdetailseite werden Anhänge jetzt direkt angezeigt und können in einem neuen Tab geöffnet werden.
