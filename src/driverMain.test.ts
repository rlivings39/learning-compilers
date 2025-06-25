import { test, expect } from "vitest";
import { parseAndCheckArguments } from "./driverMain.js";
import path from "path";

test("Test driver cli", () => {
  expect(() => parseAndCheckArguments([])).toThrow();
  expect(() => parseAndCheckArguments(["foo.c"])).to.not.throw();
  expect(() =>
    parseAndCheckArguments(["file.c", "--lex", "--codegen"])
  ).toThrow();
  expect(() => parseAndCheckArguments(["file.c", "--lex"])).to.not.throw();
  expect(() => parseAndCheckArguments(["file.c", "--parse"])).to.not.throw();
  expect(() => parseAndCheckArguments(["file.c", "--codegen"])).to.not.throw();
  expect(() => parseAndCheckArguments(["file.c", "--asdfsdaf"])).toThrow();
  expect(() => parseAndCheckArguments(["-h"])).to.not.throw();
});
