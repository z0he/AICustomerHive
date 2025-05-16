import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { submitUserFeedback } from '../lib/notification-service';

const router = Router();

// Define feedback submission schema
const feedbackSchema = z.object({
  feedbackType: z.enum(['suggestion', 'bug', 'question', 'other']),
  message: z.string().min(1, 'Feedback message is required').max(1000),
  userEmail: z.string().email().optional(),
});

// API endpoint for submitting feedback
router.post('/api/feedback', async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const validatedData = feedbackSchema.parse(req.body);
    
    // Get user info from session if authenticated
    const userId = req.user?.id;
    const username = req.user?.username;
    
    // Submit the feedback
    await submitUserFeedback({
      userId,
      username,
      feedbackType: validatedData.feedbackType,
      message: validatedData.message,
      userEmail: validatedData.userEmail,
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip, // If you want to track this
        path: req.headers.referer, // Current page path
      },
    });
    
    return res.status(201).json({ 
      success: true, 
      message: 'Thank you for your feedback!' 
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid feedback data', 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit feedback' 
    });
  }
});

export default router;