const {
  handleCORS,
  clearAllRateLimits,
  clearRateLimit,
  createResponse,
  createErrorResponse,
  logSecurityEvent
} = require('./utils');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    
    // Only allow in development
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NETLIFY_DEV === 'true';
    
    if (!isDevelopment) {
      logSecurityEvent(event, 'Unauthorized rate limit reset attempt in production', { ip: clientIP });
      return createErrorResponse(403, 'Operation not allowed in production');
    }

    // Parse request body
    let body = {};
    try {
      if (event.body) {
        body = JSON.parse(event.body);
      }
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON body');
    }

    const { endpoint, ip, clearAll } = body;

    if (clearAll === true) {
      clearAllRateLimits();
      logSecurityEvent(event, 'All rate limits cleared', { requestedBy: clientIP });
      return createResponse(200, {
        message: 'All rate limits cleared successfully',
        action: 'clear_all'
      });
    }

    if (endpoint && ip) {
      clearRateLimit(ip, endpoint);
      logSecurityEvent(event, 'Rate limit cleared for specific IP/endpoint', { 
        requestedBy: clientIP,
        clearedIP: ip,
        clearedEndpoint: endpoint
      });
      return createResponse(200, {
        message: `Rate limit cleared for ${ip} on ${endpoint}`,
        action: 'clear_specific',
        ip,
        endpoint
      });
    }

    return createErrorResponse(400, 'Please provide either clearAll=true or both ip and endpoint parameters');

  } catch (error) {
    console.error('Rate limit reset error:', error);
    logSecurityEvent(event, 'Rate limit reset function error', { error: error.message });
    return createErrorResponse(500, 'Internal server error');
  }
};
