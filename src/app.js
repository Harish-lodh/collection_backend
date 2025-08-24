import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import loanRoutes from './routes/loan.js';
import userDataRoutes from './routes/user-data.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/', loanRoutes);
app.use('/api', userDataRoutes);

export default app;