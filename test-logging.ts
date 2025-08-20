// Test file to verify our error logging improvements
import { toLoggableError, logError } from './src/lib/log';

// Mock error object similar to what Supabase might return
const mockError = {
  message: "Test error message",
  code: "404",
  hint: "Check your profile data",
  details: { userId: "123" }
};

// Test our toLoggableError function
console.log("Testing toLoggableError:");
console.log(toLoggableError(mockError));

// Test our logError function
console.log("\nTesting logError:");
logError("Test context", mockError);

// Test with different error types
console.log("\nTesting with different error types:");
logError("String error", "This is a string error");
logError("Null error", null);
logError("Undefined error", undefined);
logError("Empty object error", {});