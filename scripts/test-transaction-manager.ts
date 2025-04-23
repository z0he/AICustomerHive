import { db, TransactionManager } from '../server/lib/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testTransactionManager() {
  try {
    console.log('Testing TransactionManager...');

    // First, let's query existing users
    const existingUsers = await db.select().from(users);
    console.log('Existing users:', existingUsers);
    
    // Test successful transaction using the TransactionManager
    const result = await TransactionManager.execute(async (txDb) => {
      // Step 1: Insert a temporary user
      const tempUserName = `test_user_${Date.now()}`;
      console.log(`Creating temporary user: ${tempUserName}`);
      
      const insertResult = await txDb.insert(users).values({
        username: tempUserName,
        password: 'test_password',
        name: 'Test User',
        initials: 'TU'
      }).returning();
      
      const tempUser = insertResult[0];
      console.log('Created temp user:', tempUser);
      
      // Step 2: Delete the temporary user
      const deleteResult = await txDb.delete(users)
        .where(eq(users.id, tempUser.id))
        .returning();
      
      console.log('Deleted temp user:', deleteResult);
      
      return { 
        success: true, 
        message: 'Transaction completed successfully',
        user: tempUser
      };
    });
    
    console.log('Transaction result:', result);
    
    // Verify the user is gone
    const finalUsers = await db.select().from(users);
    console.log('Final users count:', finalUsers.length);
    
    console.log('Transaction test completed successfully');
    return result;
  } catch (error) {
    console.error('Error during transaction test:', error);
    throw error;
  }
}

testTransactionManager()
  .then((result) => {
    console.log('Test completed with result:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });