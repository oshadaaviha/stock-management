// Initialize default users with properly hashed passwords
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initUsers() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'stockdb'
  });

  console.log('Initializing users...\n');

  const users = [
    {
      username: 'admin',
      name: 'Administrator',
      email: 'admin@lenama.lk',
      password: 'admin123',
      role: 'Admin'
    },
    {
      username: 'finance',
      name: 'Finance User',
      email: 'finance@lenama.lk',
      password: 'finance123',
      role: 'Finance'
    },
    {
      username: 'reporter',
      name: 'Reporter User',
      email: 'reporter@lenama.lk',
      password: 'reporter123',
      role: 'Reporter'
    }
  ];

  for (const user of users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Check if user exists
      const [existing] = await conn.query(
        'SELECT id FROM users WHERE username = ?',
        [user.username]
      );

      if (existing.length > 0) {
        console.log(`✓ User '${user.username}' already exists (skipping)`);
      } else {
        await conn.query(
          'INSERT INTO users (username, name, email, password, role, status) VALUES (?,?,?,?,?,?)',
          [user.username, user.name, user.email, hashedPassword, user.role, 'Active']
        );
        console.log(`✓ Created user '${user.username}' with role '${user.role}'`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Password: ${user.password} (CHANGE THIS!)\n`);
      }
    } catch (err) {
      console.error(`✗ Failed to create user '${user.username}':`, err.message);
    }
  }

  await conn.end();
  console.log('\nDone! You can now login with the credentials above.');
  console.log('⚠️  IMPORTANT: Change all default passwords after first login!\n');
}

initUsers().catch(console.error);
