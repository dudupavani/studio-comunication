type TestFn = () => void | Promise<void>;

const pending: { name: string; fn: TestFn }[] = [];

export function test(name: string, fn: TestFn) {
  pending.push({ name, fn });
}

export async function runAllTests() {
  let failures = 0;
  for (const { name, fn } of pending) {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`𐄂 ${name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} test(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${pending.length} test(s) passed.`);
  }
}
