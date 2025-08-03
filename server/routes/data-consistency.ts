import { Router } from "express";
import { dataConsistencyService } from "../services/data-consistency-service.js";

const router = Router();

/**
 * GET /api/data-consistency/audit
 * Perform a comprehensive data consistency audit
 */
router.get('/data-consistency/audit', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const auditResults = await dataConsistencyService.performFullDataConsistencyAudit();
    res.json(auditResults);
  } catch (error) {
    console.error('Error performing data consistency audit:', error);
    res.status(500).json({ error: 'Failed to perform data consistency audit' });
  }
});

/**
 * GET /api/data-consistency/health
 * Get data consistency health score and recommendations
 */
router.get('/data-consistency/health', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const healthScore = await dataConsistencyService.getDataConsistencyHealthScore();
    res.json(healthScore);
  } catch (error) {
    console.error('Error fetching data consistency health score:', error);
    res.status(500).json({ error: 'Failed to fetch data consistency health score' });
  }
});

/**
 * POST /api/data-consistency/fix
 * Run data consistency fixes (same as audit but explicit about fixing)
 */
router.post('/data-consistency/fix', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const fixResults = await dataConsistencyService.performFullDataConsistencyAudit();
    res.json({
      message: 'Data consistency fixes completed',
      ...fixResults
    });
  } catch (error) {
    console.error('Error running data consistency fixes:', error);
    res.status(500).json({ error: 'Failed to run data consistency fixes' });
  }
});

export default router;