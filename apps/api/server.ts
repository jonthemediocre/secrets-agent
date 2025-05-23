import express, { Request, Response, NextFunction } from 'express';
import envRouter from './agents/secrets/routes/env.routes'; // Adjust path as necessary
import { createLogger } from '../../src/utils/logger';

const logger = createLogger('Server');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Register your routes
app.use('/api/env', envRouter);

// (Optional) A simple health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).send('API Online and Healthy');
});

// Global error handler (basic example)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled server error', { 
    error: err.message,
    stack: err.stack 
  });
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid
  });
});

export default app; // Optional: for testing or if used elsewhere 