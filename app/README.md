# Address Book Management System — Fullstack

A complete client-server contact manager: an Express + SQLite REST API on
the backend, and a card-catalog styled HTML/CSS/JS frontend that talks to
it over HTTP. Data lives in a real database file on the server, so it's
shared by everyone who opens the app — not just saved in one browser.

## Project structure

```
addressbook-fullstack/
├── backend/
│   ├── server.js          Express app: serves the API and the frontend
│   ├── db.js               SQLite connection + schema (better-sqlite3)
│   ├── validators.js        Shared validation rules (name/phone/email)
│   ├── routes/
│   │   └── contacts.js      All REST endpoints for contacts
│   └── package.json
└── frontend/
    ├── index.html            Page shell
    ├── styles.css            Card-catalog styling
    └── app.js                Talks to the API, renders the UI
```

## Running it

Requires **Node.js 18+**.

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:3000** — the same server serves both the API
and the frontend, so there's nothing else to start.

A SQLite database file is created automatically at `backend/data/address_book.db`
on first run. Delete that file to reset all data.

## API reference

All endpoints are under `/api/contacts` and return JSON.

| Method | Path                        | Description                                  |
|--------|-----------------------------|-----------------------------------------------|
| GET    | `/`                         | List contacts. Query params: `search`, `favorite=true`, `sort=name-asc\|name-desc\|recent` |
| GET    | `/:id`                      | Get one contact                               |
| POST   | `/`                         | Create a contact — `{name, phone, email?, address?, notes?}` |
| PUT    | `/:id`                      | Update a contact (same body as POST)          |
| PATCH  | `/:id/favorite`             | Toggle favorite status                        |
| DELETE | `/:id`                      | Delete a contact                              |
| GET    | `/export`                   | Download all contacts as JSON                 |
| POST   | `/import`                   | Bulk import — body is an array of contacts, duplicates skipped |
| GET    | `/:id/vcard`                | Download one contact as a `.vcf` file         |

**Validation** (enforced server-side, in `validators.js`):
- `name` — required, non-empty
- `phone` — required, 7–15 digits, only digits/`+`/`-`/spaces/parentheses allowed
- `email` — optional, must look like `name@example.com` if provided

**Duplicate check**: a new or edited contact is rejected (`409 Conflict`) if
its name or phone number matches an existing contact.

## Team division (suggested)

| Module                  | Owner focus                                      |
|--------------------------|---------------------------------------------------|
| `db.js` + `validators.js`| Data model, schema, validation rules              |
| `routes/contacts.js`     | REST API logic, duplicate checking, import/export |
| `server.js`              | App wiring, static file serving                   |
| `frontend/`              | UI, API calls, all user-facing behavior           |

## Extending it further

- Swap SQLite for PostgreSQL/MySQL by changing `db.js` — the rest of the
  app is unaffected since every query goes through that one file.
- Add user accounts: introduce a `users` table and check a session/JWT in
  each route before touching `contacts`.
- Deploy: any host that runs Node (Render, Railway, a VPS) works — just
  run `npm install && npm start` there, same as locally.
