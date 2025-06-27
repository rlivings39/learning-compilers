import { test, expect } from "vitest";
import * as tacky from "./tacky";
test("Tacky construction", () => {
  const var0 = tacky.Var("tmp0");
  const var1 = tacky.Var("tmp1");
  const c0 = tacky.Constant(37);
  const comp = tacky.Complement(c0, var0);
  const uminus = tacky.UnaryMinus(c0, var1);
  const ret = tacky.Return(var1);
  const func = tacky.Function("main", [comp, uminus, ret]);
  const prog = tacky.Program(func);

  expect(prog.func).toBe(func);
  expect(func.name).toBe("main");
  expect(func.body).toHaveLength(3);
  expect(func.body).toEqual([comp, uminus, ret]);
  expect(ret.val).toBe(var1);
  expect(uminus.dst).toBe(var1);
  expect(uminus.src).toBe(c0);
  expect(comp.src).toBe(c0);
  expect(comp.dst).toBe(var0);
  expect(c0.val).toEqual(37);
  expect(var1.name).toBe("tmp1");
  expect(var0.name).toBe("tmp0");
});
