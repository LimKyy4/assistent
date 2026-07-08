import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

import { loginHandler, changePasswordHandler, verifyToken } from './auth.js';
import { logError } from './logger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { getStats } from './routes/stats.js';
import { getDompet, updateDompet } from './routes/dompet.js';
import { getTransaksi, createTransaksi, updateTransaksi, deleteTransaksi, exportTransaksiCsv } from './routes/transaksi.js';
import { getKategori, createKategori, updateKategori, deleteKategori } from './routes/kategori.js';
import { getJadwal, createJadwal, updateJadwal, deleteJadwal } from './routes/jadwal.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security Headers ──
app.use(helmet());

// ── CORS ──
app.use(cors({
    origin: true, // Allow any origin (safe for development behind auth)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// ── Logging ──
app.use(morgan(':method :url :status :response-time ms'));

// ── Body Parser ──
app.use(express.json({ limit: '1mb' }));

// ── Rate Limiting ──
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 10,
    message: { error: 'Terlalu banyak percobaan login. Coba lagi 15 menit.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter umum untuk semua endpoint API (kecuali login sudah punya sendiri)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Terlalu banyak permintaan. Coba lagi 15 menit.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Routes ──

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
app.post('/api/auth/login', loginLimiter, loginHandler);
app.put('/api/auth/password', verifyToken, apiLimiter, changePasswordHandler);

// Stats
app.get('/api/stats', apiLimiter, verifyToken, getStats);

// Dompet
app.get('/api/dompet', apiLimiter, verifyToken, getDompet);
app.put('/api/dompet', apiLimiter, verifyToken, updateDompet);

// Transaksi
app.get('/api/transaksi', apiLimiter, verifyToken, getTransaksi);
app.post('/api/transaksi', apiLimiter, verifyToken, createTransaksi);
app.put('/api/transaksi/:id', apiLimiter, verifyToken, updateTransaksi);
app.delete('/api/transaksi/:id', apiLimiter, verifyToken, deleteTransaksi);
app.get('/api/transaksi/export', apiLimiter, verifyToken, exportTransaksiCsv);

// Kategori
app.get('/api/kategori', apiLimiter, verifyToken, getKategori);
app.post('/api/kategori', apiLimiter, verifyToken, createKategori);
app.put('/api/kategori/:id', apiLimiter, verifyToken, updateKategori);
app.delete('/api/kategori/:id', apiLimiter, verifyToken, deleteKategori);

// Jadwal
app.get('/api/jadwal', apiLimiter, verifyToken, getJadwal);
app.post('/api/jadwal', apiLimiter, verifyToken, createJadwal);
app.put('/api/jadwal/:id', apiLimiter, verifyToken, updateJadwal);
app.delete('/api/jadwal/:id', apiLimiter, verifyToken, deleteJadwal);

// ── Global Error Handler ──
app.use((err, req, res, next) => {
    logError('Server', err.stack || err.message);
    res.status(500).json({ error: 'Terjadi kesalahan internal server' });
});

// ── Start ──
app.listen(PORT, () => {
    console.log(`Server API berjalan di http://localhost:${PORT}`);
});
