import { test, expect } from "vitest";

import * as ast from "./ast";
import { prettyPrint } from "./pretty-print";

test("Pretty printer", () => {
  const numC = ast.NumericConstant(12);
  const v = ast.Var("var");
  const decl = ast.Declaration(v.name, ast.NumericConstant(3));
  const assignStmt = ast.ExprStmt(ast.Assignment(v, numC));
  const add = ast.BinaryExpr("plus", v, numC);
  const retS = ast.ReturnStmt(add);
  const nullS = ast.NullStmt();
  const func = ast.Function("main", [decl, assignStmt, nullS, retS]);
  const prog = ast.Program(func);
  const pp = prettyPrint(prog).trim();
  expect(pp).toEqual(`Program (
  Function main() {
    Declaration (var,3);
    =(var, 12);
    ;
    return plus(var, 12);
  }
)`);
});
