# Environment Variables Setup

## Generated Values

- **NODE_ENV**: `production`
- **JWT_SECRET**: `[GENERATED_SECRET_HIDDEN]`
- **JWT_EXPIRE**: `7d`
- **BCRYPT_SALT_ROUNDS**: `12`
- **API_TIMEOUT**: `10000`
- **RATE_LIMIT_WINDOW_MS**: `900000`
- **RATE_LIMIT_MAX_REQUESTS**: `100`
- **MAX_FILE_SIZE**: `5000000`
- **LOG_LEVEL**: `info`
- **SESSION_SECRET**: `[GENERATED_SECRET_HIDDEN]`
- **API_KEY**: `[GENERATED_SECRET_HIDDEN]`
- **ENCRYPTION_KEY**: `[GENERATED_SECRET_HIDDEN]`

## Security Notes

- ⚠️ **JWT_SECRET**: 44 characters, cryptographically secure
- ⚠️ **SESSION_SECRET**: 32 characters, unique per environment
- ⚠️ **API_KEY**: 32 characters hex string
- ⚠️ **ENCRYPTION_KEY**: 44 characters, future-proof

## Setup Methods

### Method 1: Netlify Dashboard
1. Go to Site Settings → Environment Variables
2. Add each variable manually

### Method 2: Netlify CLI
Run the generated script:
```bash
bash scripts/netlify-env-commands.sh
```

### Method 3: Import from File
```bash
netlify env:import scripts/production.env
```

## Verification
After setting variables, verify:
```bash
netlify env:list
```

## Security Reminders
- 🔒 Never commit secrets to version control
- 🔄 Rotate secrets quarterly
- 🔍 Use different secrets per environment
- 📝 Keep secure backup of production secrets
