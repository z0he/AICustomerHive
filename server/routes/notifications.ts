import { Router, Request, Response } from 'express';
import { db } from '../db';
import { desc, eq, sql, count } from 'drizzle-orm';
import { systemNotifications } from '@shared/schema';
import { 
  getRecentNotifications, 
  markNotificationAsRead 
} from '../lib/notification-service';

const router = Router();

/**
 * Get all notifications with pagination and filtering
 */
router.get('/api/admin/notifications', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type as string;
    const severity = req.query.severity as string;
    const isRead = req.query.isRead === 'true';
    
    let query = db.select().from(systemNotifications);
    
    // Apply filters if provided
    if (type) {
      query = query.where(eq(systemNotifications.type, type));
    }
    
    if (severity) {
      query = query.where(eq(systemNotifications.severity, severity));
    }
    
    if (req.query.isRead !== undefined) {
      query = query.where(eq(systemNotifications.isRead, isRead));
    }
    
    // Order by created date (most recent first)
    query = query.orderBy(desc(systemNotifications.createdAt)).limit(limit).offset(offset);
    
    const notifications = await query;
    
    return res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

/**
 * Get notification counts (total and unread)
 */
router.get('/api/admin/notifications/count', async (req: Request, res: Response) => {
  try {
    const result = await db.select({
      total: count(),
      unread: count(sql`CASE WHEN ${systemNotifications.isRead} = false THEN 1 END`),
    }).from(systemNotifications);
    
    return res.json({
      total: result[0]?.total || 0,
      unread: result[0]?.unread || 0,
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    return res.status(500).json({ message: 'Failed to fetch notification counts' });
  }
});

/**
 * Mark a notification as read
 */
router.post('/api/admin/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }
    
    const success = await markNotificationAsRead(id);
    
    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

/**
 * Mark all notifications as read
 */
router.post('/api/admin/notifications/mark-all-read', async (req: Request, res: Response) => {
  try {
    const result = await db.update(systemNotifications)
      .set({ isRead: true })
      .where(eq(systemNotifications.isRead, false))
      .returning();
    
    return res.json({ 
      success: true,
      count: result.length
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

/**
 * Delete a notification
 */
router.delete('/api/admin/notifications/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }
    
    const result = await db.delete(systemNotifications)
      .where(eq(systemNotifications.id, id))
      .returning();
    
    if (result.length > 0) {
      return res.json({ success: true });
    } else {
      return res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ message: 'Failed to delete notification' });
  }
});

export default router;