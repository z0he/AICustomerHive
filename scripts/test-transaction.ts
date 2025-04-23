import { db } from '../server/lib/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testNonTransactionalOperation() {
  try {
    console.log('Testing database operations...');

    // First, let's query existing users
    const existingUsers = await db.select().from(users);
    console.log('Existing users:', existingUsers);
    
    // Create a temporary user
    const tempUserName = `test_user_${Date.now()}`;
    console.log(`Creating temporary user: ${tempUserName}`);
    
    const insertResult = await db.insert(users).values({
      username: tempUserName,
      password: 'test_password',
      name: 'Test User',
      initials: 'TU'
    }).returning();
    
    const tempUser = insertResult[0];
    console.log('Created temp user:', tempUser);
    
    // Delete the temporary user
    const deleteResult = await db.delete(users)
      .where(eq(users.id, tempUser.id))
      .returning();
    
    console.log('Deleted temp user:', deleteResult);
    
    // Verify the user is gone
    const finalUsers = await db.select().from(users);
    console.log('Final users count:', finalUsers.length);
    
    console.log('Database operations test completed successfully');
    return { success: true, message: 'Operations completed successfully' };
  } catch (error) {
    console.error('Error during database operations:', error);
    throw error;
  }
}

testNonTransactionalOperation()
  .then((result) => {
    console.log('Test result:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });