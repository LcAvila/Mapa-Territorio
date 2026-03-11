const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database.cjs');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = 'super-secret-key';

app.use(cors());
app.use(express.json({ limit: '50mb' })); // allow bas64 photos e planilhas maiores
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuração do Multer para armazenamento temporário
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Acesso negado' });
    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch {
        res.status(401).json({ message: 'Token inválido' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito' });
    next();
};

// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, repCode: user.repCode, tipo: user.tipo, estado_end: user.estado_end },
            SECRET_KEY
        );
        res.json({ token, role: user.role, tipo: user.tipo, repCode: user.repCode, estado_end: user.estado_end });
    } else {
        res.status(401).json({ message: 'Usuário ou senha inválidos' });
    }
});

// ─── PROFILE (any authenticated user) ───────────────────────────────────────

const PUBLIC_USER_FIELDS = 'id, username, role, tipo, repCode, full_name, cpf_cnpj, telefone, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, photo, created_at';

app.get('/api/profile', authenticate, (req, res) => {
    const user = db.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`).get(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(user);
});

app.put('/api/profile', authenticate, (req, res) => {
    const { full_name, cpf_cnpj, telefone, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end, photo, password } = req.body;
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });

    const newPassword = password ? bcrypt.hashSync(password, 10) : existing.password;

    db.prepare(`
        UPDATE users SET
            full_name = ?, cpf_cnpj = ?, telefone = ?,
            cep = ?, logradouro = ?, numero = ?, complemento = ?,
            bairro_end = ?, cidade = ?, estado_end = ?,
            photo = ?, password = ?
        WHERE id = ?
    `).run(
        full_name || existing.full_name,
        cpf_cnpj || existing.cpf_cnpj,
        telefone || existing.telefone,
        cep || existing.cep,
        logradouro || existing.logradouro,
        numero || existing.numero,
        complemento || existing.complemento,
        bairro_end || existing.bairro_end,
        cidade || existing.cidade,
        estado_end || existing.estado_end,
        photo !== undefined ? photo : existing.photo,
        newPassword,
        req.user.id
    );
    res.json({ success: true });
});

// ─── INTEREST ────────────────────────────────────────────────────────────────

app.post('/api/interest', (req, res) => {
    const { nome, email, telefone, empresa, municipio, uf, modo, observacoes } = req.body;
    if (!nome || !municipio || !uf) return res.status(400).json({ message: 'Nome, município e UF são obrigatórios' });
    db.prepare(`INSERT INTO interest_requests (nome, email, telefone, empresa, municipio, uf, modo, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(nome, email || null, telefone || null, empresa || null, municipio, uf, modo || null, observacoes || null);
    res.json({ success: true });
});

app.get('/api/interest', authenticate, requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM interest_requests ORDER BY created_at DESC').all());
});

app.put('/api/interest/:id', authenticate, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['pending', 'accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Status inválido' });
    if (!db.prepare('SELECT id FROM interest_requests WHERE id = ?').get(id)) return res.status(404).json({ message: 'Não encontrado' });
    db.prepare('UPDATE interest_requests SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
});

// ─── USERS (admin) ───────────────────────────────────────────────────────────

app.get('/api/users', authenticate, requireAdmin, (req, res) => {
    res.json(db.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users ORDER BY id ASC`).all());
});

app.post('/api/users', authenticate, requireAdmin, (req, res) => {
    const { username, password, role, tipo, repCode, full_name, cpf_cnpj, telefone, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end } = req.body;
    if (!username || !password || !role) return res.status(400).json({ message: 'Username, senha e papel são obrigatórios' });
    if (!['admin', 'user', 'supervisor'].includes(role)) return res.status(400).json({ message: 'Papel inválido' });
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) return res.status(409).json({ message: 'Username já existe' });

    const hashed = bcrypt.hashSync(password, 10);
    db.prepare(`
        INSERT INTO users (username, password, role, tipo, repCode, full_name, cpf_cnpj, telefone, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashed, role, tipo || 'representante', repCode || null, full_name || null, cpf_cnpj || null, telefone || null, cep || null, logradouro || null, numero || null, complemento || null, bairro_end || null, cidade || null, estado_end || null);
    res.json({ success: true });
});

app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });

    const { username, password, role, tipo, repCode, full_name, cpf_cnpj, telefone, cep, logradouro, numero, complemento, bairro_end, cidade, estado_end } = req.body;
    const newUsername = username || existing.username;
    if (newUsername !== existing.username) {
        if (db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, id))
            return res.status(409).json({ message: 'Username já existe' });
    }

    db.prepare(`
        UPDATE users SET username=?, password=?, role=?, tipo=?, repCode=?,
            full_name=?, cpf_cnpj=?, telefone=?, cep=?, logradouro=?, numero=?,
            complemento=?, bairro_end=?, cidade=?, estado_end=?
        WHERE id=?
    `).run(
        newUsername,
        password ? bcrypt.hashSync(password, 10) : existing.password,
        role || existing.role,
        tipo || existing.tipo,
        repCode !== undefined ? (repCode || null) : existing.repCode,
        full_name !== undefined ? full_name : existing.full_name,
        cpf_cnpj !== undefined ? cpf_cnpj : existing.cpf_cnpj,
        telefone !== undefined ? telefone : existing.telefone,
        cep !== undefined ? cep : existing.cep,
        logradouro !== undefined ? logradouro : existing.logradouro,
        numero !== undefined ? numero : existing.numero,
        complemento !== undefined ? complemento : existing.complemento,
        bairro_end !== undefined ? bairro_end : existing.bairro_end,
        cidade !== undefined ? cidade : existing.cidade,
        estado_end !== undefined ? estado_end : existing.estado_end,
        id
    );
    res.json({ success: true });
});

app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (req.user.id === id) return res.status(400).json({ message: 'Você não pode deletar sua própria conta' });
    if (!db.prepare('SELECT id FROM users WHERE id = ?').get(id)) return res.status(404).json({ message: 'Usuário não encontrado' });
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
});

// ─── REPRESENTATIVES ─────────────────────────────────────────────────────────

app.get('/api/representatives', (req, res) => {
    const reps = db.prepare('SELECT * FROM representatives ORDER BY code ASC').all();
    res.json(reps.map(r => ({ ...r, isVago: !!r.isVago })));
});

app.post('/api/representatives', authenticate, requireAdmin, (req, res) => {
    const { code, name, fullName, isVago, colorIndex } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'Código e nome são obrigatórios' });
    db.prepare(`INSERT OR REPLACE INTO representatives (code, name, fullName, isVago, colorIndex) VALUES (?, ?, ?, ?, ?)`)
        .run(code, name, fullName || name, isVago ? 1 : 0, colorIndex || 0);
    res.json({ success: true });
});

app.put('/api/representatives/:code', authenticate, requireAdmin, (req, res) => {
    const { code } = req.params;
    const { name, fullName, isVago, colorIndex } = req.body;
    const existing = db.prepare('SELECT * FROM representatives WHERE code = ?').get(code);
    if (!existing) return res.status(404).json({ message: 'Representante não encontrado' });
    db.prepare(`UPDATE representatives SET name=?, fullName=?, isVago=?, colorIndex=? WHERE code=?`)
        .run(name || existing.name, fullName || existing.fullName, isVago !== undefined ? (isVago ? 1 : 0) : existing.isVago, colorIndex !== undefined ? colorIndex : existing.colorIndex, code);
    res.json({ success: true });
});

app.delete('/api/representatives/:code', authenticate, requireAdmin, (req, res) => {
    const { code } = req.params;
    db.prepare('DELETE FROM territories WHERE repCode = ?').run(code);
    db.prepare('DELETE FROM representatives WHERE code = ?').run(code);
    res.json({ success: true });
});

// ─── TERRITORIES ─────────────────────────────────────────────────────────────

app.get('/api/territories', (req, res) => {
    res.json(db.prepare('SELECT * FROM territories ORDER BY uf, municipio, modo').all());
});

app.post('/api/territories', authenticate, requireAdmin, (req, res) => {
    const { municipio, uf, repCode, modo } = req.body;
    if (!municipio || !uf || !repCode || !modo) return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    if (db.prepare('SELECT id FROM territories WHERE municipio=? AND uf=? AND repCode=? AND modo=?').get(municipio, uf, repCode, modo))
        return res.status(409).json({ message: 'Atribuição já existe' });
    db.prepare('INSERT INTO territories (municipio, uf, repCode, modo) VALUES (?, ?, ?, ?)').run(municipio, uf, repCode, modo);
    res.json({ success: true });
});

app.delete('/api/territories/:id', authenticate, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM territories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.delete('/api/territories/municipio/:municipio/:uf/:modo', authenticate, requireAdmin, (req, res) => {
    const { municipio, uf, modo } = req.params;
    db.prepare('DELETE FROM territories WHERE municipio=? AND uf=? AND modo=?').run(municipio, uf, modo);
    res.json({ success: true });
});

app.post('/api/territories/reallocate', authenticate, requireAdmin, (req, res) => {
    const { municipio, uf, repCode, modo } = req.body;
    if (!municipio || !uf || !repCode || !modo) return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    db.prepare('DELETE FROM territories WHERE municipio=? AND uf=? AND modo=?').run(municipio, uf, modo);
    db.prepare('INSERT INTO territories (municipio, uf, repCode, modo) VALUES (?, ?, ?, ?)').run(municipio, uf, repCode, modo);
    res.json({ success: true });
});

// ─── LOGISTICS SCRIPT ────────────────────────────────────────────────────────

app.get('/api/generate-plan', authenticate, requireAdmin, (req, res) => {
    const scriptPath = path.join(__dirname, 'generateLogisticsPlan.js');
    const outputPath = path.join(__dirname, 'Planilha Logistica - Saida.xlsx');

    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error("Error generating plan:", error);
            return res.status(500).json({ message: 'Erro ao gerar o plano logístico' });
        }
        res.download(outputPath, 'Planilha_Logistica.xlsx', (err) => {
            if (err) {
                console.error("Error downloading file:", err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Erro ao enviar o arquivo' });
                }
            }
        });
    });
});

// ─── SCRIPT PYTHON PLANILHA (ROTAS) ──────────────────────────────────────────

app.post('/api/upload-planilha', authenticate, requireAdmin, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }

    const filePath = req.file.path;
    const pythonScript = path.join(__dirname, 'process_planilha.py');

    // Mudar para comando 'python' (pode ser python3 dependendo do OS)
    const pythonProcess = spawn('python', [pythonScript, filePath]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
        // Limpar arquivo logo que processado
        fs.unlink(filePath, (err) => {
            if (err) console.error("Erro ao deletar planiha temporária:", err);
        });

        if (code !== 0) {
            console.error(`Erro no processo Python (code ${code}):`, errorString);
            return res.status(500).json({ success: false, message: 'Erro ao processar a planilha.', error: errorString });
        }

        try {
            // Pode haver multiplos prints se warnings do python aconteceram, o ultimo print deve ser o JSON
            const lines = dataString.trim().split('\n');
            const jsonLine = lines[lines.length - 1]; 
            const result = JSON.parse(jsonLine);

            if (!result.success) {
                return res.status(500).json(result);
            }
            res.json(result);
        } catch (e) {
            console.error('Erro ao fazer o parse do retorno Python:', dataString);
            res.status(500).json({ success: false, message: 'Retorno inválido do processador de planilhas.' });
        }
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
