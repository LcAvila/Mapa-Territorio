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
    role TEXT
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
`);

// Seed Admin User
const adminPassword = bcrypt.hashSync('admin123', 10);
const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
insertUser.run('admin', adminPassword, 'admin');

module.exports = db;
