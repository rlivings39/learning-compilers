import { test, expect } from "vitest";
import * as asm from "./asm";

test("Assembly", () => {
  const num = asm.ImmediateNumber(12);
  const reg = asm.Register();
  const mv = asm.Move(num, reg);
  const ret = asm.Return();
  const func = asm.Function("main", [mv, ret]);
  const prog = asm.Program(func);

  expect(prog.function_definition).toBe(func);
  expect(func.instructions).toHaveLength(2);
  expect(func.instructions).toEqual([mv, ret]);
  expect(mv.dst).toBe(reg);
  expect(mv.src).toBe(num);
  expect(num.value).toBe(12);
});
