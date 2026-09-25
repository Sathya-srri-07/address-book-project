const express = require("express");
const db = require("../db");
const { validateContact } = require("../validators");

const router = express.Router();

function rowToContact(row) {
  return { ...row, favorite: !!row.favorite };
}

function findDuplicate(name, phone, excludeId) {
  const stmt = db.prepare(`
    SELECT id FROM contacts
    WHERE (LOWER(TRIM(name)) = LOWER(TRIM(?)) OR TRIM(phone) = TRIM(?))
      AND id != ?
  `);
  return stmt.get(name, phone, excludeId || -1);
}

// GET /api/contacts?search=&favorite=true&sort=name-asc|name-desc|recent
router.get("/", (req, res) => {
  const { search = "", favorite, sort = "name-asc" } = req.query;

  let sql = "SELECT * FROM contacts WHERE 1=1";
  const params = [];

  if (search) {
    sql += " AND (LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(email) LIKE ?)";
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term, term);
  }
  if (favorite === "true") sql += " AND favorite = 1";

  if (sort === "name-desc") sql += " ORDER BY name COLLATE NOCASE DESC";
  else if (sort === "recent") sql += " ORDER BY created_at DESC";
  else sql += " ORDER BY name COLLATE NOCASE ASC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToContact));
});

// GET /api/contacts/export  (all contacts as JSON — must be defined before /:id)
router.get("/export", (req, res) => {
  const rows = db.prepare("SELECT * FROM contacts ORDER BY name COLLATE NOCASE ASC").all();
  res.setHeader("Content-Disposition", "attachment; filename=address-book-export.json");
  res.json(rows.map(rowToContact));
});

// POST /api/contacts/import  (bulk import, skips duplicates)
router.post("/import", (req, res) => {
  const incoming = Array.isArray(req.body) ? req.body : [];
  const insert = db.prepare(`
    INSERT INTO contacts (name, phone, email, address, notes, favorite, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let added = 0;
  let skipped = 0;
  const tx = db.transaction((items) => {
    for (const item of items) {
      if (!item || !item.name || !item.phone) { skipped++; continue; }
      if (findDuplicate(item.name, item.phone, null)) { skipped++; continue; }
      insert.run(
        String(item.name), String(item.phone), String(item.email || ""),
        String(item.address || ""), String(item.notes || ""),
        item.favorite ? 1 : 0, Date.now()
      );
      added++;
    }
  });
  tx(incoming);

  res.json({ added, skipped });
});

// GET /api/contacts/:id/vcard  (single contact as a .vcf file)
router.get("/:id/vcard", (req, res) => {
  const row = db.prepare("SELECT * FROM contacts WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Contact not found." });

  const vcf = [
    "BEGIN:VCARD", "VERSION:3.0",
    `FN:${row.name}`,
    `TEL:${row.phone}`,
    row.email ? `EMAIL:${row.email}` : null,
    row.address ? `ADR:;;${row.address.replace(/\n/g, " ")};;;;` : null,
    "END:VCARD", ""
  ].filter(Boolean).join("\n");

  res.setHeader("Content-Type", "text/vcard");
  res.setHeader("Content-Disposition", `attachment; filename="${row.name.replace(/[^a-z0-9]+/gi, "_")}.vcf"`);
  res.send(vcf);
});

// GET /api/contacts/:id
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM contacts WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Contact not found." });
  res.json(rowToContact(row));
});

// POST /api/contacts
router.post("/", (req, res) => {
  const { name, phone, email = "", address = "", notes = "" } = req.body || {};
  const errors = validateContact({ name, phone, email });
  if (errors.length) return res.status(400).json({ errors });

  if (findDuplicate(name, phone, null)) {
    return res.status(409).json({ errors: ["A contact with this name or phone number already exists."] });
  }

  const info = db.prepare(`
    INSERT INTO contacts (name, phone, email, address, notes, favorite, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(name.trim(), phone.trim(), email.trim(), address.trim(), notes.trim(), Date.now());

  const created = db.prepare("SELECT * FROM contacts WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(rowToContact(created));
});

// PUT /api/contacts/:id
router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM contacts WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Contact not found." });

  const { name, phone, email = "", address = "", notes = "" } = req.body || {};
  const errors = validateContact({ name, phone, email });
  if (errors.length) return res.status(400).json({ errors });

  if (findDuplicate(name, phone, existing.id)) {
    return res.status(409).json({ errors: ["A contact with this name or phone number already exists."] });
  }

  db.prepare(`
    UPDATE contacts SET name = ?, phone = ?, email = ?, address = ?, notes = ?
    WHERE id = ?
  `).run(name.trim(), phone.trim(), email.trim(), address.trim(), notes.trim(), existing.id);

  const updated = db.prepare("SELECT * FROM contacts WHERE id = ?").get(existing.id);
  res.json(rowToContact(updated));
});

// PATCH /api/contacts/:id/favorite
router.patch("/:id/favorite", (req, res) => {
  const existing = db.prepare("SELECT * FROM contacts WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Contact not found." });

  const newValue = existing.favorite ? 0 : 1;
  db.prepare("UPDATE contacts SET favorite = ? WHERE id = ?").run(newValue, existing.id);
  res.json(rowToContact({ ...existing, favorite: newValue }));
});

// DELETE /api/contacts/:id
router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM contacts WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Contact not found." });
  res.status(204).end();
});

module.exports = router;
