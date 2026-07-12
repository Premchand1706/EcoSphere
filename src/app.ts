import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import carbonRoutes from './routes/carbon.routes';
import csrRoutes from './routes/csr.routes';
import governanceRoutes from './routes/governance.routes';
import gamificationRoutes from './routes/gamification.routes';
import esgRoutes from './routes/esg.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

// Routes configuration
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/carbon', carbonRoutes);
app.use('/api/v1/csr', csrRoutes);
app.use('/api/v1/governance', governanceRoutes);
app.use('/api/v1/gamification', gamificationRoutes);
app.use('/api/v1/esg', esgRoutes);

// RFC 7807 Global Error Handler
app.use(errorHandler);

export default app;
