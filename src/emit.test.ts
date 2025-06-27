import { test, expect } from "vitest";
import * as asm from "./asm";
import { emitAsm } from "./emit";

test("Emitter", () => {
  const num = asm.ImmediateNumber(12);
  const reg = asm.Register();
  const mv = asm.Move(num, reg);
  const ret = asm.Return();
  const func = asm.Function("main", [mv, ret]);
  const prog = asm.Program(func);

  let asmCode = emitAsm(prog);
  const expected = `  .globl main
main:
  movl $12, %eax
  ret
  .section .note.GNU-stack,"",@progbits
`;
  expect(asmCode).toEqual(expected);
});
