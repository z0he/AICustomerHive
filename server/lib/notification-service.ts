import { sendEmail } from './mailgun';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { systemNotifications, type InsertSystemNotification } from '@shared/schema';

/**
 * Admin notification settings
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const NOTIFICATIONS_ENABLED = true;

/**
 * Notification types
 */
export enum NotificationType {
  NEW_USER = 'new_user',
  SYSTEM_ERROR = 'system_error',
  SECURITY_ALERT = 'security_alert',
  LEAD_CREATED = 'lead_created',
  FORM_SUBMISSION = 'form_submission'
}

/**
 * Notification severity levels
 */
export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Create a system notification
 */
export async function createSystemNotification({
  type,
  title,
  message,
  severity = NotificationSeverity.INFO,
  sendEmail: shouldSendEmail = NOTIFICATIONS_ENABLED,
  emailRecipient = ADMIN_EMAIL,
  relatedEntityType,
  relatedEntityId,
  metadata
}: Omit<InsertSystemNotification, 'isEmailSent' | 'createdAt'> & { 
  sendEmail?: boolean 
}): Promise<void> {
  try {
    // Create notification in database
    const notification = await db.insert(systemNotifications).values({
      type,
      title,
      message,
      severity,
      isEmailSent: false,
      emailRecipient: shouldSendEmail ? emailRecipient : null,
      relatedEntityType,
      relatedEntityId,
      metadata,
      createdAt: new Date(),
    }).returning();

    // Send email notification if enabled
    if (shouldSendEmail && emailRecipient) {
      try {
        const emailSent = await sendEmail({
          to: emailRecipient,
          from: `CRM Notification <notification@${process.env.MAILGUN_DOMAIN || 'example.com'}>`,
          subject: `CRM Notification: ${title}`,
          html: `
            <h2>${title}</h2>
            <p>${message}</p>
            ${metadata ? `<pre>${JSON.stringify(metadata, null, 2)}</pre>` : ''}
            <p>This is an automated notification from your CRM system.</p>
          `,
          text: `${title}\n\n${message}\n\n${metadata ? JSON.stringify(metadata, null, 2) : ''}\n\nThis is an automated notification from your CRM system.`
        });

        if (emailSent && notification[0]) {
          // Update notification to mark email as sent
          await db.update(systemNotifications)
            .set({ isEmailSent: true })
            .where({ id: notification[0].id });
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }
    }
  } catch (error) {
    console.error('Failed to create system notification:', error);
  }
}

/**
 * Notify about a new user registration
 */
export async function notifyNewUserRegistration(user: any): Promise<void> {
  await createSystemNotification({
    type: NotificationType.NEW_USER,
    title: 'New User Registration',
    message: `A new user has registered: ${user.name} (${user.username})`,
    severity: NotificationSeverity.INFO,
    relatedEntityType: 'user',
    relatedEntityId: user.id,
    metadata: {
      username: user.username,
      name: user.name,
      registeredAt: new Date().toISOString()
    }
  });
}

/**
 * Notify about a system error
 */
export async function notifySystemError(
  error: Error,
  context: string,
  metadata?: any
): Promise<void> {
  await createSystemNotification({
    type: NotificationType.SYSTEM_ERROR,
    title: `System Error: ${context}`,
    message: error.message || 'An unknown error occurred',
    severity: NotificationSeverity.ERROR,
    metadata: {
      errorName: error.name,
      errorStack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  });
}

/**
 * Get recent system notifications
 */
export async function getRecentNotifications(limit: number = 10): Promise<any[]> {
  try {
    const notifications = await db.select()
      .from(systemNotifications)
      .orderBy(systemNotifications.createdAt)
      .limit(limit);
    
    return notifications;
  } catch (error) {
    console.error('Failed to fetch recent notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(id: number): Promise<boolean> {
  try {
    const result = await db.update(systemNotifications)
      .set({ isRead: true })
      .where(eq(systemNotifications.id, id))
      .returning();
    
    return result.length > 0;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}