const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function createDemoUsers() {
    const usersFile = path.join(__dirname, 'data/users.json');
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);
    
    const demoUsers = [
        {
            id: 1,
            username: 'admin',
            email: 'admin@alandstore.com',
            password: adminPassword,
            fullName: 'Administrator',
            role: 'admin',
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            username: 'user',
            email: 'user@alandstore.com',
            password: userPassword,
            fullName: 'Demo User',
            role: 'user',
            createdAt: new Date().toISOString()
        }
    ];
    
    fs.writeFileSync(usersFile, JSON.stringify(demoUsers, null, 2));
    console.log('✅ Demo users created successfully!');
    console.log('👤 Admin: admin@alandstore.com / admin123');
    console.log('👤 User: user@alandstore.com / user123');
}

createDemoUsers().catch(console.error);
