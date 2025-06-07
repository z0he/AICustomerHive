// Simple test script to verify usage tracking
const { usageService } = require('./server/lib/usage-service.js');

async function testUsageTracking() {
  try {
    console.log('Testing usage tracking functionality...');
    
    // Test user ID from our database
    const testUserId = 4;
    
    // Get initial usage
    const initialUsage = await usageService.getUserUsage(testUserId);
    console.log('Initial usage:', initialUsage);
    
    // Test AI prompt limit check
    const canUseAI = await usageService.canUseAIPrompt(testUserId);
    console.log('Can use AI prompt:', canUseAI);
    
    // Test email limit check
    const canSendEmail = await usageService.canSendEmail(testUserId);
    console.log('Can send email:', canSendEmail);
    
    // Increment AI usage
    await usageService.incrementAIUsage(testUserId);
    console.log('Incremented AI usage');
    
    // Increment email usage
    await usageService.incrementEmailUsage(testUserId);
    console.log('Incremented email usage');
    
    // Get updated usage
    const updatedUsage = await usageService.getUserUsage(testUserId);
    console.log('Updated usage:', updatedUsage);
    
    console.log('Usage tracking test completed successfully!');
  } catch (error) {
    console.error('Usage tracking test failed:', error);
  }
}

testUsageTracking();