import { test, expect } from "vitest";

import * as ast from "./ast";

test("AST construction", () => {
  const numC = ast.NumericConstant(12);
  const retS = ast.ReturnStmt(numC);
  const func = ast.Function("main", [retS]);
  const func2 = ast.Function("main", [retS]);
  const prog = ast.Program(func);
  const uMinus = ast.UnaryMinus(numC);
  const comp = ast.Complement(uMinus);
  const v = ast.Var("var1");
  const assign = ast.Assignment(v, numC);
  const exprS = ast.ExprStmt(assign);
  const nullS = ast.NullStmt();
  const decl = ast.Declaration("var1", null);
  const declInit = ast.Declaration("var1", numC);

  expect(prog.function_definition).toBe(func);
  expect(prog.function_definition).not.toBe(func2);
  expect(func.name).toEqual("main");
  expect(func.body).toEqual([retS]);
  expect(retS.expr).toBe(numC);
  expect(numC.value).toEqual(12);
  expect(uMinus.expr).toBe(numC);
  expect(uMinus.op).toBe("-");
  expect(comp.expr).toBe(uMinus);
  expect(comp.op).toBe("~");
  expect(v.kind).toBe("var");
  expect(v.name).toBe("var1");
  expect(assign.kind).toBe("assignment");
  expect(assign.lhs).toBe(v);
  expect(assign.rhs).toBe(numC);
  expect(exprS.kind).toBe("expr-stmt");
  expect(exprS.expr).toBe(assign);
  expect(nullS.kind).toBe("null-stmt");
  expect(decl.kind).toBe("declaration");
  expect(decl.name).toBe("var1");
  expect(decl.init).toBeNull();
  expect(declInit.kind).toBe("declaration");
  expect(declInit.name).toBe("var1");
  expect(declInit.init).toBe(numC);
});
