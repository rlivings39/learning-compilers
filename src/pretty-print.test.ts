import { test, expect } from "vitest";

import * as ast from "./ast";
import { prettyPrint } from "./pretty-print";

test("Pretty printer", () => {
  const numC = ast.NumericConstant(12);
  const retS = ast.ReturnStmt(numC);
  const func = ast.Function("main", retS);
  const func2 = ast.Function("main", retS);
  const prog = ast.Program(func);
  const pp = prettyPrint(prog);
  expect(pp).toEqual(
    `Program (
  Function main() {
    return 12;
  }
)\n`
  );
});
