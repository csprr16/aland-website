#!/bin/bash
# Netlify Environment Variables Setup Commands
# Run these commands atau copy/paste individual commands

echo "Setting up Netlify environment variables..."

netlify env:set NODE_ENV "production"
netlify env:set JWT_SECRET "mfrmQKEZg9rjVc5WglEMlH+/1DJNvIhK+/Sr2E2mL28="
netlify env:set JWT_EXPIRE "7d"
netlify env:set BCRYPT_SALT_ROUNDS "12"
netlify env:set API_TIMEOUT "10000"
netlify env:set RATE_LIMIT_WINDOW_MS "900000"
netlify env:set RATE_LIMIT_MAX_REQUESTS "100"
netlify env:set MAX_FILE_SIZE "5000000"
netlify env:set LOG_LEVEL "info"
netlify env:set SESSION_SECRET "On4cL01Tg74aaEWHRh7yqkfVqzqeZifb"
netlify env:set API_KEY "059f47798edcfd7e819fcf1f4255d7c8"
netlify env:set ENCRYPTION_KEY "qMRzgfGiTkWA6ZWtPu21l0670ghiBUTjEO3TG8za5vo="

echo "✅ All environment variables set!"
echo "⚠️  Remember to redeploy your site after setting variables"
echo "Run: netlify deploy --prod"
