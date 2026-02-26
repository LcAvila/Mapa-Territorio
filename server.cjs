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

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito' });
    next();
};

// --- AUTH ROUTES ---

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

// --- REPRESENTATIVES ROUTES ---

// Get all representatives
app.get('/api/representatives', (req, res) => {
    const reps = db.prepare('SELECT * FROM representatives ORDER BY code ASC').all();
    res.json(reps.map(r => ({ ...r, isVago: !!r.isVago })));
});

// Create/Update representative
app.post('/api/representatives', authenticate, requireAdmin, (req, res) => {
    const { code, name, fullName, isVago, colorIndex } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'Código e nome são obrigatórios' });

    db.prepare(`
        INSERT OR REPLACE INTO representatives (code, name, fullName, isVago, colorIndex)
        VALUES (?, ?, ?, ?, ?)
    `).run(code, name, fullName || name, isVago ? 1 : 0, colorIndex || 0);

    res.json({ success: true });
});

// Delete representative (also removes their territories)
app.delete('/api/representatives/:code', authenticate, requireAdmin, (req, res) => {
    const { code } = req.params;
    db.prepare('DELETE FROM territories WHERE repCode = ?').run(code);
    db.prepare('DELETE FROM representatives WHERE code = ?').run(code);
    res.json({ success: true });
});

// Update representative (name, fullName, isVago, colorIndex — NOT code)
app.put('/api/representatives/:code', authenticate, requireAdmin, (req, res) => {
    const { code } = req.params;
    const { name, fullName, isVago, colorIndex } = req.body;
    const existing = db.prepare('SELECT * FROM representatives WHERE code = ?').get(code);
    if (!existing) return res.status(404).json({ message: 'Representante não encontrado' });
    db.prepare(`
        UPDATE representatives SET name = ?, fullName = ?, isVago = ?, colorIndex = ?
        WHERE code = ?
    `).run(
        name || existing.name,
        fullName || existing.fullName,
        isVago !== undefined ? (isVago ? 1 : 0) : existing.isVago,
        colorIndex !== undefined ? colorIndex : existing.colorIndex,
        code
    );
    res.json({ success: true });
});

// --- TERRITORIES ROUTES ---

// Get all territories
app.get('/api/territories', (req, res) => {
    const territories = db.prepare('SELECT * FROM territories ORDER BY uf, municipio, modo').all();
    res.json(territories);
});

// Assign a representative to a municipality (insert or ignore to support multiple reps per city)
app.post('/api/territories', authenticate, requireAdmin, (req, res) => {
    const { municipio, uf, repCode, modo } = req.body;
    if (!municipio || !uf || !repCode || !modo) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Check if this exact assignment already exists
    const existing = db.prepare(
        'SELECT id FROM territories WHERE municipio = ? AND uf = ? AND repCode = ? AND modo = ?'
    ).get(municipio, uf, repCode, modo);

    if (existing) {
        return res.status(409).json({ message: 'Atribuição já existe' });
    }

    db.prepare(
        'INSERT INTO territories (municipio, uf, repCode, modo) VALUES (?, ?, ?, ?)'
    ).run(municipio, uf, repCode, modo);

    res.json({ success: true });
});

// Remove a specific territory assignment
app.delete('/api/territories/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM territories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Remove all territories for a municipality
app.delete('/api/territories/municipio/:municipio/:uf/:modo', authenticate, requireAdmin, (req, res) => {
    const { municipio, uf, modo } = req.params;
    db.prepare('DELETE FROM territories WHERE municipio = ? AND uf = ? AND modo = ?').run(municipio, uf, modo);
    res.json({ success: true });
});

// Reallocate (replace all reps for a municipality/mode with a new one)
app.post('/api/territories/reallocate', authenticate, requireAdmin, (req, res) => {
    const { municipio, uf, repCode, modo } = req.body;
    if (!municipio || !uf || !repCode || !modo) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    db.prepare('DELETE FROM territories WHERE municipio = ? AND uf = ? AND modo = ?').run(municipio, uf, modo);
    db.prepare('INSERT INTO territories (municipio, uf, repCode, modo) VALUES (?, ?, ?, ?)').run(municipio, uf, repCode, modo);

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
