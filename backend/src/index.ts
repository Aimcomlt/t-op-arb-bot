import './monitoring/metrics';
import './server/http';
import { logger } from './utils/logger';
import { startWsServer } from './server/wsServer';

startWsServer();
logger.info('Backend running');
