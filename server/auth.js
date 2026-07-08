import jwt from 'jsonwebtoken';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { logError } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

if (!JWT_SECRET || !DASHBOARD_PASSWORD) {
    logError('Auth', 'JWT_SECRET dan DASHBOARD_PASSWORD wajib diisi di server/.env');
    process.exit(1);
}

export function loginHandler(req, res) {
    const { password } = req.body;
    if (!password || password !== DASHBOARD_PASSWORD) {
        return res.status(401).json({ error: 'Password salah' });
    }
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
}

export function changePasswordHandler(req, res) {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || oldPassword !== DASHBOARD_PASSWORD) {
        return res.status(401).json({ error: 'Password lama salah' });
    }
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Password baru minimal 4 karakter' });
    }

    // Persist ke .env
    try {
        const envPath = resolve(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(
            /^DASHBOARD_PASSWORD=.*/m,
            `DASHBOARD_PASSWORD=${newPassword}`
        );
        fs.writeFileSync(envPath, envContent);
        process.env.DASHBOARD_PASSWORD = newPassword; // update runtime
        res.json({ message: 'Password berhasil diubah' });
    } catch (err) {
        logError('Auth', 'Gagal menyimpan password', err);
        res.status(500).json({ error: 'Gagal menyimpan password' });
    }
}

export function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token expired atau invalid' });
    }
}
