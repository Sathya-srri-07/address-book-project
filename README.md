# Address Book Management System

A team project with three parts, all in this repo:

- **`docs/`** — the project showcase website (static HTML/CSS/JS). This
  folder is set up so GitHub Pages can serve it directly — see below.
- **`app/backend/`** — the Express + SQLite REST API.
- **`app/frontend/`** — the web app UI that talks to that API.

See [`app/README.md`](app/README.md) for how to run the full application
(backend + frontend) locally, plus the full API reference.

## Viewing the showcase website on GitHub Pages

Once this repo is pushed to GitHub:

1. Go to **Settings → Pages** in your repository.
2. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
3. Set **Branch** to `main` and the folder to **`/docs`**, then **Save**.
4. After a minute or two, your site is live at:
   `https://<your-username>.github.io/<repo-name>/`

The showcase site is static, so Pages can host it for free. The backend
API (`app/backend`) is a running server, not a static site, so it needs a
host that runs Node — see the "Extending it further" section of
`app/README.md` for options.

## Repo structure

```
address-book-project/
├── docs/                 GitHub Pages source — the showcase website
│   └── index.html
├── app/
│   ├── backend/          Express + SQLite REST API
│   ├── frontend/         Web app UI (calls the API)
│   └── README.md         Full setup + API docs
└── README.md             You are here
```
