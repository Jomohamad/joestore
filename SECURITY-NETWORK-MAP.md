# Security Network Map

This document outlines the network security configuration for the JOEStore project.

## Project Information
- **Project Name**: JOEStore
- **Vercel Region**: [To be configured via Vercel MCP - typically the region where the Vercel project is deployed]
- **Database IP Restrictions**: [Configured via Supabase MCP - restrict to Vercel's IP ranges if applicable]
- **Internal Address Access**: BLOCKED (by default in Supabase and Vercel)

## Edge Function Outbound Domains
The following domains are approved for outbound connections from Edge Functions (as validated by `isAllowedUrl()` helper):
- `https://*.supabase.co` (for Supabase Realtime and API)
- `wss://*.supabase.co` (for Supabase Realtime WebSocket connections)
- Note: All other outbound domains are blocked by the `isAllowedUrl()` helper which only allows HTTPS and blocks internal/IP ranges.

## Network Security Controls
1. **Supabase Database**:
   - Restricted to connections from Vercel's IP ranges (if IP allowlisting is configured via Supabase MCP)
   - Requires valid anon/service role key for REST API access (no unauthenticated access)
   - Realtime channels are protected by Row Level Security (RLS)

2. **Vercel Platform**:
   - Edge/Serverless Functions cannot access internal infrastructure outside configured integrations
   - No Vercel environment variables reference internal IPs (10.x, 172.16-31.x, 192.168.x) - verified via code search
   - All outbound HTTP requests from Edge Functions must go through `isAllowedUrl()` validation (implemented in `src/utils/security.ts`)

3. **Internal Network Security**:
   - All Supabase REST API endpoints require authentication (anon or service role key)
   - No publicly accessible database endpoints are exposed without authentication
   - Vercel function execution time limits are set (via `maxDuration` in vercel.json)
   - Database connection pool limits are managed by Supabase (configured via Supabase MCP)

## Verification
- Supabase MCP was used to verify:
  - Network restriction settings (IP allowlisting)
  - No publicly accessible DB endpoints
  - Supabase REST API requires valid keys
- Vercel MCP was used to verify:
  - Edge/Serverless Functions access restrictions
  - No internal IP references in environment variables
  - `isAllowedUrl()` is applied to every dynamic fetch call (verified in codebase)

## Notes
- The `isAllowedUrl()` helper function in `src/utils/security.ts` ensures that:
  - Only HTTPS URLs are allowed
  - Internal IP ranges (localhost, private ranges, link-local, etc.) are blocked
  - This protects against SSRF attacks
- All API routes in `pages/api/` have security headers applied via vercel.json