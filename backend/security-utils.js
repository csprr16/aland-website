const fs = require('fs');
const path = require('path');

// Security Logger
class SecurityLogger {
    constructor() {
        this.logDir = path.join(__dirname, 'logs');
        this.securityLogFile = path.join(this.logDir, 'security.log');
        this.errorLogFile = path.join(this.logDir, 'error.log');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    
    log(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };
        
        const logLine = JSON.stringify(logEntry) + '\n';
        
        // Write to appropriate log file
        const logFile = level === 'ERROR' ? this.errorLogFile : this.securityLogFile;
        
        try {
            fs.appendFileSync(logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
        
        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${timestamp}] ${level}: ${message}`, meta);
        }
    }
    
    info(message, meta = {}) {
        this.log('INFO', message, meta);
    }
    
    warning(message, meta = {}) {
        this.log('WARNING', message, meta);
    }
    
    error(message, meta = {}) {
        this.log('ERROR', message, meta);
    }
    
    security(message, meta = {}) {
        this.log('SECURITY', message, meta);
    }
}

// Request logging middleware
function requestLogger(req, res, next) {
    const startTime = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
        const duration = Date.now() - startTime;
        const logData = {
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length') || 0
        };
        
        // Log suspicious requests
        if (res.statusCode >= 400) {
            logger.warning('HTTP Error Response', logData);
        }
        
        originalSend.call(this, data);
    };
    
    next();
}

// Security headers checker
function checkSecurityHeaders(req, res, next) {
    // Check for suspicious patterns
    const suspiciousPatterns = [
        /(<script|javascript:|data:|vbscript:)/i,
        /(union|select|insert|delete|drop|create|alter)/i,
        /(\.\.\/|\.\.\\)/,
        /(exec|eval|system|shell_exec)/i
    ];
    
    const checkString = JSON.stringify({
        url: req.url,
        query: req.query,
        body: req.body
    });
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(checkString)) {
            logger.security('Suspicious Request Detected', {
                ip: req.ip,
                url: req.url,
                method: req.method,
                userAgent: req.get('User-Agent'),
                pattern: pattern.toString()
            });
            
            return res.status(400).json({
                message: 'Request blocked for security reasons',
                code: 'SECURITY_VIOLATION'
            });
        }
    }
    
    next();
}

// Database backup function
function createDatabaseBackup() {
    const backupDir = path.join(__dirname, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const dataDir = path.join(__dirname, 'data');
    
    if (fs.existsSync(dataDir)) {
        const files = ['users.json', 'products.json', 'orders.json'];
        
        files.forEach(file => {
            const sourcePath = path.join(dataDir, file);
            const backupPath = path.join(backupDir, `${timestamp}-${file}`);
            
            if (fs.existsSync(sourcePath)) {
                try {
                    fs.copyFileSync(sourcePath, backupPath);
                    logger.info(`Database backup created: ${backupPath}`);
                } catch (error) {
                    logger.error(`Failed to create backup for ${file}`, { error: error.message });
                }
            }
        });
        
        // Clean old backups (keep only last 10)
        cleanOldBackups(backupDir);
    }
}

function cleanOldBackups(backupDir) {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);
        
        // Keep only the 10 most recent backups
        const filesToDelete = files.slice(10);
        
        filesToDelete.forEach(file => {
            const filePath = path.join(backupDir, file.name);
            fs.unlinkSync(filePath);
            logger.info(`Old backup deleted: ${file.name}`);
        });
    } catch (error) {
        logger.error('Error cleaning old backups', { error: error.message });
    }
}

// Initialize logger
const logger = new SecurityLogger();

module.exports = {
    SecurityLogger,
    logger,
    requestLogger,
    checkSecurityHeaders,
    createDatabaseBackup
};
