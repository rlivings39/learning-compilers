import { test, expect } from "vitest";

import * as ast from "./ast";
import { umask } from "process";

test("AST construction", () => {
  const numC = ast.NumericConstant(12);
  const retS = ast.ReturnStmt(numC);
  const func = ast.Function("main", retS);
  const func2 = ast.Function("main", retS);
  const prog = ast.Program(func);
  const uMinus = ast.UnaryMinus(numC);
  const comp = ast.Complement(uMinus);

  expect(prog.function_definition).toBe(func);
  expect(prog.function_definition).not.toBe(func2);
  expect(func.name).toEqual("main");
  expect(func.body).toBe(retS);
  expect(retS.expr).toBe(numC);
  expect(numC.value).toEqual(12);
  expect(uMinus.expr).toBe(numC);
  expect(uMinus.op).toBe("-");
  expect(comp.expr).toBe(uMinus);
  expect(comp.op).toBe("~");
});
