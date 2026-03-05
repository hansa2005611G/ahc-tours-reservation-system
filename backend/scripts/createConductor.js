const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createConductor() {
  try {
    const username = 'conductor1';
    const email = 'conductor@ahctours.com';
    const password = 'conductor123';
    const fullName = 'John Conductor';
    const phone = '0771234567';

    console.log('🔐 Creating conductor account...');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Full Name:', fullName);
    console.log('');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if user exists
    const [existing] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [username, email]
    );

    if (existing.length > 0) {
      console.log('⚠️ User already exists. Updating password and details...');
      await db.query(
        `UPDATE users 
         SET password_hash = ?, role = ?, full_name = ?, phone = ?, email = ?
         WHERE username = ?`,
        [hashedPassword, 'conductor', fullName, phone, email, username]
      );
      console.log('✅ Conductor account updated successfully!');
    } else {
      console.log('✅ Creating new conductor account...');
      await db.query(
        `INSERT INTO users (username, email, password_hash, role, full_name, phone, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [username, email, hashedPassword, 'conductor', fullName, phone]
      );
      console.log('✅ Conductor account created successfully!');
    }

    // Get the created user
    const [user] = await db.query(
      'SELECT user_id, username, email, role, full_name, phone FROM users WHERE username = ?',
      [username]
    );

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📱 Conductor Account Details');
    console.log('═══════════════════════════════════════════════════════');
    console.log('User ID:      ', user[0].user_id);
    console.log('Username:     ', user[0].username);
    console.log('Email:        ', user[0].email);
    console.log('Full Name:    ', user[0].full_name);
    console.log('Phone:        ', user[0].phone);
    console.log('Role:         ', user[0].role);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🔑 Login Credentials (Use EITHER):');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Option 1:');
    console.log('  Username:   ', username);
    console.log('  Password:   ', password);
    console.log('');
    console.log('Option 2:');
    console.log('  Email:      ', email);
    console.log('  Password:   ', password);
    console.log('═══════════════════════════════════════════════════════');
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating conductor:', error);
    process.exit(1);
  }
}

createConductor();