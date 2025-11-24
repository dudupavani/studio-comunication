import "./permissions.test";
import { runAllTests } from "./utils/test-harness";

runAllTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
