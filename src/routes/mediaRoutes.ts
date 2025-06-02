import { Router } from 'express';
import { processMedia } from '../controllers/mediaController';
import { upload } from '../utils/fileHandler';

const router = Router();

router.post('/analyze', upload.any(), processMedia);

export default router;