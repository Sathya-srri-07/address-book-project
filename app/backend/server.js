const path = require("path");
const express = require("express");
const cors = require("cors");
const contactsRouter = require("./routes/contacts");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// REST API
app.use("/api/contacts", contactsRouter);

// Serve the frontend (static HTML/CSS/JS)
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));

// Any non-API route falls back to the app shell (simple SPA support)
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.use((req, res) => res.status(404).json({ error: "Not found." }));

app.listen(PORT, () => {
  console.log(`Address Book server running at http://localhost:${PORT}`);
});
