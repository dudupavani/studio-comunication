// Test file to verify our error logging improvements
import { SupabaseClient } from '@supabase/supabase-js';

// Mock error object similar to what Supabase might return
interface MockError {
  message: string;
  code?: string;
  hint?: string;
  details?: any;
}

// Test our improved error logging
const mockError: MockError = {
  message: "Test error message",
  code: "404",
  hint: "Check your profile data",
  details: { userId: "123" }
};

// This is how we're now logging errors in our app
console.error("Error fetching profile in AppLayout:", {
  message: mockError.message,
  details: mockError,
  code: mockError.code,
  hint: mockError.hint
});

// Test the org page error logging
const orgRes = {
  ok: false as const,
  error: mockError
};

console.error("ORG PAGE — getOrgWithDetails failed:", {
  message: orgRes.error?.message || "Unknown error",
  details: orgRes,
  code: orgRes.error?.code,
  hint: orgRes.error?.hint
});

// Test the updateOrgDetails error logging
const res = {
  ok: false as const,
  error: mockError
};

console.error("updateOrgDetails failed:", {
  message: res.error?.message || "Unknown error",
  details: res.error,
  code: res.error?.code,
  hint: res.error?.hint
});