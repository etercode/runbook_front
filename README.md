# Runbook Front

SvelteKit frontend for the Runbook personal learning library.

Pairs with the Symfony API at `http://localhost:8090` (see `../runbook`).

## Design — Open Folio

A reading journal, not a dashboard clone of `runbook_ui`:

- **Brand:** Syne — monumental cover on home
- **Reading:** Literata (designed for long-form screens)
- **UI:** Manrope
- Cobalt + ember mark, stone page, paper reading sheet
- Cover → shelf composition, floating action dock on notes, topic wall

## Setup

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:8090
npm install
npm run dev
```

Default admin (backend seed): `admin@runbook.local` / `runbook123`
