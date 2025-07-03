import { test, expect } from "vitest";
import * as asm from "./asm";
import { emitAsm } from "./emit";

test("Emitter", () => {
  const num = asm.ImmediateNumber(12);
  const alloc = asm.AllocateStack(4);
  const stack = asm.Stack(-4);
  const axreg = asm.Register("AX");
  const mv = asm.Move(num, stack);
  const neg = asm.Neg(stack);
  const not = asm.Not(stack);
  const mvax = asm.Move(stack, axreg);
  const ret = asm.Return();
  const func = asm.Function("main", [alloc, mv, neg, not, mvax, ret]);
  const prog = asm.Program(func);

  const asmCode = emitAsm(prog);
  const expected = `  .globl main
main:
  pushq %rbp
  movq  %rsp, %rbp
  subq $4, %rsp
  movl $12, -4(%rbp)
  negl -4(%rbp)
  notl -4(%rbp)
  movl -4(%rbp), %eax
  movq %rbp, %rsp
  popq %rbp
  ret

  .section .note.GNU-stack,"",@progbits
`;
  expect(asmCode).toEqual(expected);
});
