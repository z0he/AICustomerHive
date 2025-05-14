import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { systemNotifications } from "@shared/schema";
import { getRecentNotifications, markNotificationAsRead } from "../lib/notification-service";

const router = Router();

/**
 * Get recent system notifications
 */
router.get("/api/admin/notifications", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const notifications = await getRecentNotifications(limit);
    return res.json(notifications);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

/**
 * Mark a notification as read
 */
router.post("/api/admin/notifications/:id/read", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    
    const success = await markNotificationAsRead(id);
    
    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(404).json({ message: "Notification not found" });
    }
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

/**
 * Delete a notification
 */
router.delete("/api/admin/notifications/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    
    const result = await db.delete(systemNotifications)
      .where(eq(systemNotifications.id, id))
      .returning();
    
    if (result && result.length > 0) {
      return res.json({ success: true });
    } else {
      return res.status(404).json({ message: "Notification not found" });
    }
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
});

/**
 * Get notification count (total and unread)
 */
router.get("/api/admin/notifications/count", async (req: Request, res: Response) => {
  try {
    // Get total count
    const totalResult = await db.select({ count: db.fn.count() })
      .from(systemNotifications);
    
    // Get unread count
    const unreadResult = await db.select({ count: db.fn.count() })
      .from(systemNotifications)
      .where(eq(systemNotifications.isRead, false));
    
    const total = parseInt(totalResult[0].count.toString());
    const unread = parseInt(unreadResult[0].count.toString());
    
    return res.json({ total, unread });
  } catch (error) {
    console.error("Failed to fetch notification count:", error);
    return res.status(500).json({ message: "Failed to fetch notification count" });
  }
});

/**
 * Mark all notifications as read
 */
router.post("/api/admin/notifications/mark-all-read", async (req: Request, res: Response) => {
  try {
    await db.update(systemNotifications)
      .set({ isRead: true })
      .where(eq(systemNotifications.isRead, false));
    
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

export default router;