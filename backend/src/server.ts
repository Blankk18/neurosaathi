// ============================================================================
// NEUROSAATHI BACKEND SERVER
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/database.js';
import { authRouter } from './routes/auth.js';
import { faceRouter } from './routes/face.js';
import { scansRouter } from './routes/scans.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'neurosaathi-biometrics', time: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/face', faceRouter);
app.use('/api/face', scansRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[server error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server & Database
async function main() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`NeuroSaathi Biometrics Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
