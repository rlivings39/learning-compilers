import { test, expect } from "vitest";
import { parseArguments } from "./driverMain.js";

test("Test driver cli", () => {
  expect(() => parseArguments([])).toThrow();
  expect(() => parseArguments(["foo.c"])).to.not.throw();
  expect(() => parseArguments(["file.c", "--lex", "--codegen"])).toThrow();
  expect(() => parseArguments(["file.c", "--lex"])).to.not.throw();
  expect(() => parseArguments(["file.c", "--parse"])).to.not.throw();
  expect(() => parseArguments(["file.c", "--codegen"])).to.not.throw();
  expect(() =>
    parseArguments(["file.c", "--codegen", "--pretty-print"])
  ).to.not.throw();
  expect(() => parseArguments(["file.c", "--tacky"])).to.not.throw();
  expect(() =>
    parseArguments(["file.c", "--tacky", "--pretty-print-tacky"])
  ).to.not.throw();
  expect(() =>
    parseArguments(["file.c", "--pretty-print", "--pretty-print-tacky"])
  ).to.not.throw();

  expect(() => parseArguments(["file.c", "--asdfsdaf"])).toThrow();
  expect(() => parseArguments(["-h"])).to.not.throw();
});
