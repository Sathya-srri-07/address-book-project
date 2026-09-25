const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, "address_book.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    email      TEXT DEFAULT '',
    address    TEXT DEFAULT '',
    notes      TEXT DEFAULT '',
    favorite   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

module.exports = db;
