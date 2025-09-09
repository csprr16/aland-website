#!/usr/bin/env node
/**
 * Environment Variables Generator for AlandStore
 * Generates secure environment variables untuk Netlify deployment
 * 
 * Usage: node scripts/generate-env.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 AlandStore Environment Variables Generator');
console.log('================================================');

// Generate secure random values
function generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('base64');
}

function generateHexSecret(length = 16) {
    return crypto.randomBytes(length).toString('hex');
}

// Environment variables template
const envVariables = {
    // Core Application
    NODE_ENV: 'production',
    
    // Security - Generate fresh secrets
    JWT_SECRET: generateSecret(32),
    JWT_EXPIRE: '7d',
    BCRYPT_SALT_ROUNDS: '12',
    
    // API Configuration
    API_TIMEOUT: '10000',
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: '900000',    // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: '100',
    
    // Upload Configuration
    MAX_FILE_SIZE: '5000000',          // 5MB
    
    // Logging
    LOG_LEVEL: 'info',
    
    // Optional: Additional secrets for future use
    SESSION_SECRET: generateSecret(24),
    API_KEY: generateHexSecret(16),
    ENCRYPTION_KEY: generateSecret(32)
};

// Development vs Production differences
const devVariables = {
    ...envVariables,
    NODE_ENV: 'development',
    JWT_EXPIRE: '24h',
    BCRYPT_SALT_ROUNDS: '10',
    LOG_LEVEL: 'debug'
};

// Create scripts directory if it doesn't exist
const scriptsDir = path.dirname(__filename);
if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
}

// Generate .env file untuk local development
function generateLocalEnv() {
    const envContent = Object.entries(devVariables)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    const envPath = path.join(process.cwd(), '.env');
    
    // Check if .env already exists
    if (fs.existsSync(envPath)) {
        const backup = envPath + '.backup.' + Date.now();
        fs.copyFileSync(envPath, backup);
        console.log(`📁 Existing .env backed up to: ${path.basename(backup)}`);
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Generated .env file untuk local development');
}

// Generate production environment variables file
function generateProductionEnv() {
    const prodEnvPath = path.join(scriptsDir, 'production.env');
    const envContent = Object.entries(envVariables)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    fs.writeFileSync(prodEnvPath, envContent);
    console.log('✅ Generated production.env file');
    console.log(`📁 Location: ${prodEnvPath}`);
}

// Generate Netlify CLI commands
function generateNetlifyCommands() {
    const commands = Object.entries(envVariables)
        .map(([key, value]) => `netlify env:set ${key} "${value}"`)
        .join('\n');
    
    const commandsPath = path.join(scriptsDir, 'netlify-env-commands.sh');
    const script = `#!/bin/bash
# Netlify Environment Variables Setup Commands
# Run these commands atau copy/paste individual commands

echo "Setting up Netlify environment variables..."

${commands}

echo "✅ All environment variables set!"
echo "⚠️  Remember to redeploy your site after setting variables"
echo "Run: netlify deploy --prod"
`;

    fs.writeFileSync(commandsPath, script);
    fs.chmodSync(commandsPath, '755'); // Make executable
    console.log('✅ Generated Netlify CLI commands');
    console.log(`📁 Location: ${commandsPath}`);
}

// Generate environment variables documentation
function generateEnvDocs() {
    const docsPath = path.join(scriptsDir, 'environment-setup.md');
    const docs = `# Environment Variables Setup

## Generated Values

${Object.entries(envVariables).map(([key, value]) => {
    const isSecret = key.includes('SECRET') || key.includes('KEY');
    const displayValue = isSecret ? '[GENERATED_SECRET_HIDDEN]' : value;
    return `- **${key}**: \`${displayValue}\``;
}).join('\n')}

## Security Notes

- ⚠️ **JWT_SECRET**: ${envVariables.JWT_SECRET.length} characters, cryptographically secure
- ⚠️ **SESSION_SECRET**: ${envVariables.SESSION_SECRET.length} characters, unique per environment
- ⚠️ **API_KEY**: ${envVariables.API_KEY.length} characters hex string
- ⚠️ **ENCRYPTION_KEY**: ${envVariables.ENCRYPTION_KEY.length} characters, future-proof

## Setup Methods

### Method 1: Netlify Dashboard
1. Go to Site Settings → Environment Variables
2. Add each variable manually

### Method 2: Netlify CLI
Run the generated script:
\`\`\`bash
bash scripts/netlify-env-commands.sh
\`\`\`

### Method 3: Import from File
\`\`\`bash
netlify env:import scripts/production.env
\`\`\`

## Verification
After setting variables, verify:
\`\`\`bash
netlify env:list
\`\`\`

## Security Reminders
- 🔒 Never commit secrets to version control
- 🔄 Rotate secrets quarterly
- 🔍 Use different secrets per environment
- 📝 Keep secure backup of production secrets
`;

    fs.writeFileSync(docsPath, docs);
    console.log('✅ Generated environment documentation');
    console.log(`📁 Location: ${docsPath}`);
}

// Main execution
console.log('\n🎯 Generating environment variables...\n');

try {
    generateLocalEnv();
    generateProductionEnv();
    generateNetlifyCommands();
    generateEnvDocs();
    
    console.log('\n🎉 Environment setup complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Review generated .env file untuk local development');
    console.log('2. Copy production variables to Netlify dashboard');
    console.log('3. Or run: bash scripts/netlify-env-commands.sh');
    console.log('4. Deploy: netlify deploy --prod');
    console.log('\n🔒 Security Reminders:');
    console.log('- Keep production.env file secure');
    console.log('- Never commit secrets to Git');
    console.log('- Rotate secrets regularly');
    console.log('- Test deployment after setting variables');
    
} catch (error) {
    console.error('❌ Error generating environment variables:', error.message);
    process.exit(1);
}

console.log('\n================================================');
console.log('🔐 Environment Variables Generator Complete');
