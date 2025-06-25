import { test, expect } from "vitest";
import { driverMain } from "./driverMain.js";

test("Test driver cli", () => {
  expect(() => driverMain([])).toThrow();
  expect(driverMain(["/path/to/file.c"])).toBe(0);
  expect(() => driverMain(["file.c", "--lex", "--codegen"])).toThrow();
  expect(driverMain(["file.c", "--lex"])).toBe(0);
  expect(driverMain(["file.c", "--parse"])).toBe(0);
  expect(driverMain(["file.c", "--codegen"])).toBe(0);
  expect(() => driverMain(["file.c", "--asdfsdaf"])).toThrow();
});
