import { executeTransaction, db } from '../server/lib/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testTransaction() {
  try {
    console.log('Testing database transaction...');

    // First, let's query existing users
    const existingUsers = await db.select().from(users);
    console.log('Existing users:', existingUsers);

    // Test successful transaction (create a temporary user and then delete it)
    const result = await executeTransaction(async (tx) => {
      // Step 1: Insert a temporary user
      const tempUserName = `test_user_${Date.now()}`;
      console.log(`Creating temporary user: ${tempUserName}`);
      
      const insertResult = await tx.insert(users).values({
        username: tempUserName,
        password: 'test_password',
        name: 'Test User',
        initials: 'TU'
      }).returning();
      
      const tempUser = insertResult[0];
      console.log('Created temp user:', tempUser);
      
      // Step 2: Delete the temporary user
      const deleteResult = await tx.delete(users)
        .where(eq(users.id, tempUser.id))
        .returning();
      
      console.log('Deleted temp user:', deleteResult);
      
      return { success: true, message: 'Transaction completed successfully' };
    });
    
    console.log('Transaction result:', result);
    
    // Verify the user is gone
    const finalUsers = await db.select().from(users);
    console.log('Final users count:', finalUsers.length);
    
    console.log('Transaction test completed successfully');
  } catch (error) {
    console.error('Error during transaction test:', error);
  }
}

testTransaction()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });