#!/usr/bin/env node
/**
 * Environment Variables Validator for AlandStore
 * Validates environment variables untuk local dan production
 * 
 * Usage: 
 *   node scripts/validate-env.js              # Validate current environment
 *   node scripts/validate-env.js --local      # Validate .env file
 *   node scripts/validate-env.js --netlify    # Validate Netlify environment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AlandStore Environment Variables Validator');
console.log('===============================================');

// Required environment variables
const REQUIRED_VARS = [
    'NODE_ENV',
    'JWT_SECRET',
    'JWT_EXPIRE',
    'BCRYPT_SALT_ROUNDS'
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
    'API_TIMEOUT',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
    'MAX_FILE_SIZE',
    'LOG_LEVEL'
];

// Validation rules
const VALIDATION_RULES = {
    NODE_ENV: {
        required: true,
        allowedValues: ['development', 'staging', 'production'],
        description: 'Application environment'
    },
    JWT_SECRET: {
        required: true,
        minLength: 32,
        type: 'string',
        description: 'JWT signing secret (minimum 32 characters)'
    },
    JWT_EXPIRE: {
        required: true,
        pattern: /^(\d+[dhm]|never)$/,
        description: 'JWT expiration time (e.g., 7d, 24h, 30m)'
    },
    BCRYPT_SALT_ROUNDS: {
        required: true,
        type: 'number',
        min: 10,
        max: 15,
        description: 'Bcrypt salt rounds (10-15)'
    },
    API_TIMEOUT: {
        required: false,
        type: 'number',
        min: 1000,
        max: 30000,
        description: 'API request timeout in milliseconds'
    },
    RATE_LIMIT_WINDOW_MS: {
        required: false,
        type: 'number',
        min: 60000,
        description: 'Rate limiting window in milliseconds'
    },
    RATE_LIMIT_MAX_REQUESTS: {
        required: false,
        type: 'number',
        min: 1,
        max: 1000,
        description: 'Maximum requests per rate limit window'
    },
    MAX_FILE_SIZE: {
        required: false,
        type: 'number',
        min: 1000000,
        max: 10000000,
        description: 'Maximum file upload size in bytes'
    },
    LOG_LEVEL: {
        required: false,
        allowedValues: ['error', 'warn', 'info', 'debug'],
        description: 'Logging level'
    }
};

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

// Load environment variables from .env file
function loadEnvFile(filePath = '.env') {
    const envPath = path.resolve(filePath);
    
    if (!fs.existsSync(envPath)) {
        console.log(colorize(`⚠️  Environment file not found: ${filePath}`, 'yellow'));
        return {};
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    console.log(colorize(`📁 Loaded environment from: ${filePath}`, 'blue'));
    return envVars;
}

// Validate single environment variable
function validateVariable(key, value, rule) {
    const errors = [];
    const warnings = [];
    
    // Check if required variable exists
    if (rule.required && (!value || value.trim() === '')) {
        errors.push(`Missing required variable: ${key}`);
        return { errors, warnings };
    }
    
    if (!value) {
        return { errors, warnings };
    }
    
    // Type validation
    if (rule.type === 'number') {
        const numValue = parseInt(value);
        if (isNaN(numValue)) {
            errors.push(`${key} must be a number, got: ${value}`);
        } else {
            if (rule.min !== undefined && numValue < rule.min) {
                errors.push(`${key} must be >= ${rule.min}, got: ${numValue}`);
            }
            if (rule.max !== undefined && numValue > rule.max) {
                warnings.push(`${key} is ${numValue}, consider if this is appropriate (max recommended: ${rule.max})`);
            }
        }
    }
    
    // String length validation
    if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${key} must be at least ${rule.minLength} characters, got: ${value.length}`);
    }
    
    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
        errors.push(`${key} must be one of [${rule.allowedValues.join(', ')}], got: ${value}`);
    }
    
    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${key} format invalid: ${value}`);
    }
    
    // Security checks for secrets
    if (key.includes('SECRET') || key.includes('KEY')) {
        if (value.length < 16) {
            errors.push(`${key} is too short for security (minimum 16 characters)`);
        }
        
        // Check for weak patterns
        const weakPatterns = [
            /^(password|secret|key)$/i,
            /^(123|abc|test|demo)/i,
            /^(.)\1{5,}$/, // Repeated characters
        ];
        
        for (const pattern of weakPatterns) {
            if (pattern.test(value)) {
                warnings.push(`${key} appears to use a weak pattern`);
                break;
            }
        }
    }
    
    return { errors, warnings };
}

// Main validation function
function validateEnvironment(envVars, environment = 'current') {
    console.log(`\n🔍 Validating ${environment} environment variables...\n`);
    
    let totalErrors = 0;
    let totalWarnings = 0;
    
    // Validate all defined rules
    for (const [key, rule] of Object.entries(VALIDATION_RULES)) {
        const value = envVars[key];
        const { errors, warnings } = validateVariable(key, value, rule);
        
        // Display result
        if (errors.length === 0 && warnings.length === 0) {
            if (value) {
                const displayValue = (key.includes('SECRET') || key.includes('KEY')) 
                    ? '[HIDDEN]' 
                    : value;
                console.log(colorize(`✅ ${key}: ${displayValue}`, 'green'));
            } else if (!rule.required) {
                console.log(colorize(`⚪ ${key}: (optional, not set)`, 'blue'));
            }
        }
        
        // Display errors
        errors.forEach(error => {
            console.log(colorize(`❌ ${error}`, 'red'));
            totalErrors++;
        });
        
        // Display warnings
        warnings.forEach(warning => {
            console.log(colorize(`⚠️  ${warning}`, 'yellow'));
            totalWarnings++;
        });
    }
    
    // Check for unknown variables
    const knownVars = Object.keys(VALIDATION_RULES);
    const unknownVars = Object.keys(envVars).filter(key => !knownVars.includes(key));
    
    if (unknownVars.length > 0) {
        console.log(colorize(`\n📝 Unknown variables found:`, 'blue'));
        unknownVars.forEach(key => {
            const displayValue = (key.includes('SECRET') || key.includes('KEY')) 
                ? '[HIDDEN]' 
                : envVars[key];
            console.log(colorize(`   ${key}: ${displayValue}`, 'blue'));
        });
    }
    
    // Environment-specific validations
    if (environment === 'production') {
        // Production-specific checks
        if (envVars.NODE_ENV !== 'production') {
            totalErrors++;
            console.log(colorize(`❌ NODE_ENV should be 'production' for production environment`, 'red'));
        }
        
        if (envVars.BCRYPT_SALT_ROUNDS && parseInt(envVars.BCRYPT_SALT_ROUNDS) < 12) {
            totalWarnings++;
            console.log(colorize(`⚠️  BCRYPT_SALT_ROUNDS should be at least 12 for production`, 'yellow'));
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (totalErrors === 0 && totalWarnings === 0) {
        console.log(colorize('🎉 All environment variables are valid!', 'green'));
    } else {
        if (totalErrors > 0) {
            console.log(colorize(`❌ ${totalErrors} error(s) found`, 'red'));
        }
        if (totalWarnings > 0) {
            console.log(colorize(`⚠️  ${totalWarnings} warning(s) found`, 'yellow'));
        }
    }
    
    return { errors: totalErrors, warnings: totalWarnings };
}

// Environment-specific recommendations
function showRecommendations(environment) {
    console.log(colorize(`\n💡 Recommendations untuk ${environment}:`, 'blue'));
    
    if (environment === 'development') {
        console.log('- JWT_EXPIRE can be longer (24h) untuk easier development');
        console.log('- BCRYPT_SALT_ROUNDS can be lower (10) untuk faster testing');
        console.log('- LOG_LEVEL should be "debug" untuk detailed logging');
    } else if (environment === 'production') {
        console.log('- JWT_SECRET must be cryptographically secure (32+ chars)');
        console.log('- BCRYPT_SALT_ROUNDS should be 12+ untuk security');
        console.log('- LOG_LEVEL should be "info" atau "warn" untuk performance');
        console.log('- Set rate limiting untuk protection against abuse');
    }
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: node scripts/validate-env.js [options]

Options:
  --local         Validate .env file
  --netlify       Show Netlify environment validation guide
  --help, -h      Show this help message

Examples:
  node scripts/validate-env.js           # Validate current process.env
  node scripts/validate-env.js --local   # Validate .env file
        `);
        return;
    }
    
    if (args.includes('--netlify')) {
        console.log(`
🌍 Netlify Environment Validation Guide

To validate Netlify environment variables:

1. List current variables:
   netlify env:list

2. Set missing variables:
   netlify env:set VARIABLE_NAME "value"

3. Import from file:
   netlify env:import scripts/production.env

4. Verify by deploying:
   netlify deploy

5. Check function logs:
   netlify functions:log

Required variables untuk production:
${REQUIRED_VARS.map(v => `- ${v}`).join('\n')}
        `);
        return;
    }
    
    let envVars;
    let environment;
    
    if (args.includes('--local')) {
        envVars = loadEnvFile('.env');
        environment = 'local (.env file)';
    } else {
        envVars = process.env;
        environment = 'current process';
    }
    
    const result = validateEnvironment(envVars, environment);
    
    // Show recommendations
    const nodeEnv = envVars.NODE_ENV || 'development';
    showRecommendations(nodeEnv);
    
    // Exit with appropriate code
    if (result.errors > 0) {
        console.log(colorize('\n💥 Validation failed! Please fix the errors above.', 'red'));
        process.exit(1);
    } else if (result.warnings > 0) {
        console.log(colorize('\n⚠️  Validation passed with warnings. Consider addressing them.', 'yellow'));
        process.exit(0);
    } else {
        console.log(colorize('\n🎯 Environment validation successful!', 'green'));
        process.exit(0);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { validateEnvironment, validateVariable, loadEnvFile };
