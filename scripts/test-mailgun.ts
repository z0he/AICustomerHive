import { sendEmail } from '../server/lib/mailgun';

async function testMailgunDelivery() {
  console.log('Testing Mailgun email delivery...');
  
  try {
    const result = await sendEmail({
      from: 'noreply@mail.aicrm.co.uk',
      to: 'zohemus@gmail.com',
      subject: '[TEST] Mailgun Configuration Test',
      html: '<p>This is a test email to verify Mailgun configuration.</p>',
      text: 'This is a test email to verify Mailgun configuration.'
    });
    
    console.log('Email send result:', result);
    
    if (result) {
      console.log('✅ Email sent successfully through Mailgun');
    } else {
      console.log('❌ Email failed to send through Mailgun');
    }
    
  } catch (error) {
    console.error('❌ Mailgun test failed:', error);
    
    if (error.message.includes('sandbox')) {
      console.log('\n📋 Solution: Your Mailgun account is using a sandbox domain.');
      console.log('To send emails to any address, you need to either:');
      console.log('1. Add the recipient email to your Mailgun authorized recipients list');
      console.log('2. Upgrade to a paid Mailgun account to remove sandbox restrictions');
    }
  }
}

testMailgunDelivery().catch(console.error);