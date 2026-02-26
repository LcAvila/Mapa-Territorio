const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database.cjs');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = 'super-secret-key';

app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Acesso negado' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token inválido' });
    }
};

// --- Routes ---

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY);
        res.json({ token, role: user.role });
    } else {
        res.status(401).json({ message: 'Usuário ou senha inválidos' });
    }
});

// Get Representatives
app.get('/api/representatives', (req, res) => {
    const reps = db.prepare('SELECT * FROM representatives').all();
    res.json(reps.map(r => ({ ...r, isVago: !!r.isVago })));
});

// Create/Update Representative
app.post('/api/representatives', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito' });

    const { code, name, fullName, isVago, colorIndex } = req.body;
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO representatives (code, name, fullName, isVago, colorIndex)
    VALUES (?, ?, ?, ?, ?)
  `);
    stmt.run(code, name, fullName, isVago ? 1 : 0, colorIndex);
    res.json({ success: true });
});

// Delete Representative
app.delete('/api/representatives/:code', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito' });

    db.prepare('DELETE FROM representatives WHERE code = ?').run(req.params.code);
    res.json({ success: true });
});

// Get Territories
app.get('/api/territories', (req, res) => {
    const territories = db.prepare('SELECT * FROM territories').all();
    res.json(territories);
});

// Update Territory (Reallocation)
app.post('/api/territories/reallocate', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito' });

    const { municipio, uf, repCode, modo } = req.body;
    const stmt = db.prepare(`
    UPDATE territories SET repCode = ? 
    WHERE municipio = ? AND uf = ? AND modo = ?
  `);
    const info = stmt.run(repCode, municipio, uf, modo);

    if (info.changes === 0) {
        // If it doesn't exist, create it
        const insert = db.prepare(`
      INSERT INTO territories (municipio, uf, repCode, modo)
      VALUES (?, ?, ?, ?)
    `);
        insert.run(municipio, uf, repCode, modo);
    }

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
