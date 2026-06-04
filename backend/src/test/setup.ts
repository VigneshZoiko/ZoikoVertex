// Vitest setup — provide dummy env so the config/env schema (which calls
// process.exit on failure) passes when the controller import graph loads under
// test. No real credentials; the supabase client is mocked in every suite.
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
