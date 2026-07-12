import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`EcoSphere Backend Server is running on port ${PORT}`);
});
