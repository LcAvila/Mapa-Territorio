const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    repCode TEXT,
    tipo TEXT DEFAULT 'representante',
    full_name TEXT,
    cpf_cnpj TEXT,
    telefone TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro_end TEXT,
    cidade TEXT,
    estado_end TEXT,
    photo TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migrations — add columns if they don't exist yet
const safeAlter = (sql) => { try { db.exec(sql); } catch (_) { } };
safeAlter('ALTER TABLE users ADD COLUMN repCode TEXT');
safeAlter("ALTER TABLE interest_requests ADD COLUMN status TEXT DEFAULT 'pending'");
safeAlter("ALTER TABLE users ADD COLUMN tipo TEXT DEFAULT 'representante'");
safeAlter('ALTER TABLE users ADD COLUMN full_name TEXT');
safeAlter('ALTER TABLE users ADD COLUMN cpf_cnpj TEXT');
safeAlter('ALTER TABLE users ADD COLUMN telefone TEXT');
safeAlter('ALTER TABLE users ADD COLUMN cep TEXT');
safeAlter('ALTER TABLE users ADD COLUMN logradouro TEXT');
safeAlter('ALTER TABLE users ADD COLUMN numero TEXT');
safeAlter('ALTER TABLE users ADD COLUMN complemento TEXT');
safeAlter('ALTER TABLE users ADD COLUMN bairro_end TEXT');
safeAlter('ALTER TABLE users ADD COLUMN cidade TEXT');
safeAlter('ALTER TABLE users ADD COLUMN estado_end TEXT');
safeAlter('ALTER TABLE users ADD COLUMN photo TEXT');
safeAlter("ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP");

// Seed Admin User
const adminPassword = bcrypt.hashSync('admin123', 10);
const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, role, tipo, full_name) VALUES (?, ?, ?, ?, ?)');
insertUser.run('admin', adminPassword, 'admin', 'admin', 'Administrador');

module.exports = db;
