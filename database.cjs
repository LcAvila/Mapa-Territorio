const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    repCode TEXT
  );

  CREATE TABLE IF NOT EXISTS representatives (
    code TEXT PRIMARY KEY,
    name TEXT,
    fullName TEXT,
    isVago INTEGER,
    colorIndex INTEGER
  );

  CREATE TABLE IF NOT EXISTS territories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    municipio TEXT,
    uf TEXT,
    repCode TEXT,
    modo TEXT,
    FOREIGN KEY(repCode) REFERENCES representatives(code)
  );

  CREATE TABLE IF NOT EXISTS bairros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bairro TEXT,
    regiao TEXT,
    municipio TEXT,
    uf TEXT,
    repCode TEXT,
    modo TEXT,
    FOREIGN KEY(repCode) REFERENCES representatives(code)
  );

  CREATE TABLE IF NOT EXISTS interest_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    empresa TEXT,
    municipio TEXT NOT NULL,
    uf TEXT NOT NULL,
    modo TEXT,
    observacoes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrate: add repCode column if it doesn't exist yet
try { db.exec('ALTER TABLE users ADD COLUMN repCode TEXT'); } catch (_) { /* column already exists */ }
// Migrate: add status column to interest_requests
try { db.exec("ALTER TABLE interest_requests ADD COLUMN status TEXT DEFAULT 'pending'"); } catch (_) { /* already exists */ }

// Seed Admin User
const adminPassword = bcrypt.hashSync('admin123', 10);
const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
insertUser.run('admin', adminPassword, 'admin');

module.exports = db;
