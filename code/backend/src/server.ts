import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.com' 
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-app-type'],
}));
app.use(express.json());

// API v1 Router
app.use('/v1', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global Error Handler Middleware
app.use(errorHandler);

app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
});