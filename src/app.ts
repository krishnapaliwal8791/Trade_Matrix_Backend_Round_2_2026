import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { routes } from './routes';
import { AppError } from './utils/AppError';
import { env } from './config/env';

export const app = express();

const allowedOrigins = env.CORS_ORIGIN
  .split(',')
  .map(origin => origin.trim());

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

// Routes
app.use(routes);

// 404 Handler
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404, 'NOT_FOUND'));
});

// Global Error Handler
app.use(errorHandler);
