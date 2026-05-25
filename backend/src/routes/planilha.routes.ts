import { Router } from 'express';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

router.use(authenticate, requireAdmin);

router.get('/generate-plan', (req, res) => {
    const scriptPath = path.join(__dirname, '../../generateLogisticsPlan.js');
    const outputPath = path.join(__dirname, '../../Planilha Logistica - Saida.xlsx');

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

router.post('/upload-planilha', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }

    const filePath = req.file.path;
    const pythonScript = path.join(__dirname, '../../process_planilha.py');
    const pythonPath = process.env.PYTHON_PATH || 'python';

    let pythonProcess: any;
    try {
        pythonProcess = spawn(pythonPath, [pythonScript, filePath]);

        let dataString = '';
        let errorString = '';

        pythonProcess.on('error', (err: any) => {
            console.error('Process error:', err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Falha ao executar o processamento da planilha.', error: err.message });
            }
        });

        pythonProcess.stdout.on('data', (data: any) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data: any) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code: any) => {
            // Deleção centralizada no finally do escopo externo ou aqui? 
            // Como spawn é assíncrono, o finally do try/catch externo executaria imediatamente.
            // O plano sugere try-catch-finally, mas com spawn assíncrono isso é sutil.
            // Vou manter a deleção no close e no erro do processo, mas garantir o unlink no catch do spawn.
            fs.unlink(filePath, (err) => {
                if (err) console.error("Erro ao deletar planilha temporária no close:", err);
            });

            if (res.headersSent) return;

            if (code !== 0) {
                console.error(`Erro no processo Python (code ${code}):`, errorString);
                return res.status(500).json({ success: false, message: 'Erro ao processar a planilha.', error: errorString });
            }

            try {
                const lines = dataString.trim().split('\n');
                const jsonLine = lines[lines.length - 1]; 
                const result = JSON.parse(jsonLine);

                if (!result.success) return res.status(500).json(result);
                res.json(result);
            } catch (e) {
                console.error('Erro ao fazer o parse do retorno Python:', dataString);
                res.status(500).json({ success: false, message: 'Retorno inválido do processador de planilhas.' });
            }
        });
    } catch (spawnError: any) {
        console.error('Failed to spawn python process:', spawnError);
        fs.unlink(filePath, (err) => {
            if (err) console.error("Erro ao deletar planilha temporária no catch:", err);
        });
        return res.status(500).json({ success: false, message: 'Erro ao iniciar o processamento da planilha.', error: spawnError.message });
    }
});

export default router;
