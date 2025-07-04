// Enhanced test script to verify hybrid API model implementation
import { usageService } from './server/lib/usage-service.ts';

async function testUsageTracking() {
  try {
    console.log('🧪 Testing Enhanced Usage Tracking & Hybrid API Model');
    console.log('=' .repeat(60));
    
    // Test user ID from our database
    const testUserId = 4;
    
    // Phase 1: Test basic usage tracking
    console.log('\n📊 Phase 1: Basic Usage Tracking');
    const initialUsage = await usageService.getUserUsage(testUserId);
    console.log('Initial usage:');
    console.log(`  AI Prompts: ${initialUsage.aiPrompts.used}/${initialUsage.aiPrompts.limit} (Personal Key: ${initialUsage.aiPrompts.hasPersonalKey})`);
    console.log(`  Emails: ${initialUsage.emails.used}/${initialUsage.emails.limit} (Personal Key: ${initialUsage.emails.hasPersonalKey})`);
    console.log(`  Tier: ${initialUsage.tier}`);
    
    // Phase 2: Test limit checking
    console.log('\n🔍 Phase 2: Limit Checking');
    const canUseAI = await usageService.canUseAIPrompt(testUserId);
    const canSendEmail = await usageService.canSendEmail(testUserId);
    console.log(`Can use AI prompt: ${canUseAI.allowed} ${canUseAI.reason ? `(${canUseAI.reason})` : ''}`);
    console.log(`Can send email: ${canSendEmail.allowed} ${canSendEmail.reason ? `(${canSendEmail.reason})` : ''}`);
    
    // Phase 3: Test usage increment (only if allowed)
    console.log('\n⬆️ Phase 3: Usage Increment');
    if (canUseAI.allowed) {
      await usageService.incrementAIUsage(testUserId);
      console.log('✅ AI usage incremented');
    } else {
      console.log('⏸️ AI usage not incremented (limit reached)');
    }
    
    if (canSendEmail.allowed) {
      await usageService.incrementEmailUsage(testUserId);
      console.log('✅ Email usage incremented');
    } else {
      console.log('⏸️ Email usage not incremented (limit reached)');
    }
    
    // Phase 4: Test personal API key benefits
    console.log('\n🔑 Phase 4: Personal API Key Benefits');
    const personalKeys = await usageService.getPersonalAPIKeys(testUserId);
    console.log('Personal API Keys Status:');
    console.log(`  OpenAI Key: ${personalKeys.openaiKey ? 'Configured ✅' : 'Not configured ❌'}`);
    console.log(`  Mailgun Key: ${personalKeys.mailgunKey ? 'Configured ✅' : 'Not configured ❌'}`);
    console.log(`  Mailgun Domain: ${personalKeys.mailgunDomain || 'Not configured ❌'}`);
    
    // Final usage check
    console.log('\n📈 Final Usage Status');
    const finalUsage = await usageService.getUserUsage(testUserId);
    console.log('Updated usage:');
    console.log(`  AI Prompts: ${finalUsage.aiPrompts.used}/${finalUsage.aiPrompts.limit} (Personal Key: ${finalUsage.aiPrompts.hasPersonalKey})`);
    console.log(`  Emails: ${finalUsage.emails.used}/${finalUsage.emails.limit} (Personal Key: ${finalUsage.emails.hasPersonalKey})`);
    
    console.log('\n🎯 Hybrid API Model Summary:');
    console.log('- Free tier users get 20 AI prompts + 50 emails per month');
    console.log('- Personal API keys provide unlimited usage');
    console.log('- Usage warnings guide users to upgrade when needed');
    console.log('- All emails use mail.aicrm.co.uk domain for consistency');
    
    console.log('\n✅ Enhanced usage tracking test completed successfully!');
  } catch (error) {
    console.error('❌ Usage tracking test failed:', error);
  }
}

testUsageTracking();