import { test, expect } from "vitest";
import { driverMain } from "./driverMain.js";

test("Test driver cli", () => {
  expect(() => driverMain([])).toThrow();
  expect(() => driverMain(["/path/to/file.c"])).to.not.throw();
  expect(() => driverMain(["file.c", "--lex", "--codegen"])).toThrow();
  expect(() => driverMain(["file.c", "--lex"])).to.not.throw();
  expect(() => driverMain(["file.c", "--parse"])).to.not.throw();
  expect(() => driverMain(["file.c", "--codegen"])).to.not.throw();
  expect(() => driverMain(["file.c", "--asdfsdaf"])).toThrow();
});
