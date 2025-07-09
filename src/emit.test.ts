import { test, expect } from "vitest";
import * as asm from "./asm";
import { emitAsm } from "./emit";

test("Emitter", () => {
  const num = asm.ImmediateNumber(12);
  const alloc = asm.AllocateStack(4);
  const stack = asm.Stack(-4);
  const axreg = asm.Register("AX");
  const reg10 = asm.Register("R10");
  const reg11 = asm.Register("R11");
  const regdx = asm.Register("DX");
  const mv = asm.Move(num, stack);
  const mvReg11Regdx = asm.Move(reg11, regdx);
  const neg = asm.Neg(stack);
  const not = asm.Not(stack);
  const mvax = asm.Move(stack, axreg);
  const add = asm.Binary("add", axreg, stack);
  const sub = asm.Binary("sub", axreg, stack);
  const mul = asm.Binary("mul", axreg, stack);
  const idiv = asm.Idiv(reg10);
  const cdq = asm.Cdq();
  const ret = asm.Return();
  const func = asm.Function("main", [
    alloc,
    mv,
    mvReg11Regdx,
    neg,
    not,
    mvax,
    add,
    sub,
    mul,
    idiv,
    cdq,
    ret,
  ]);
  const prog = asm.Program(func);

  const asmCode = emitAsm(prog);
  const expected = `  .globl main
main:
  pushq %rbp
  movq  %rsp, %rbp
  subq $4, %rsp
  movl $12, -4(%rbp)
  movl %r11d, %edx
  negl -4(%rbp)
  notl -4(%rbp)
  movl -4(%rbp), %eax
  addl %eax, -4(%rbp)
  subl %eax, -4(%rbp)
  imul %eax, -4(%rbp)
  idiv %r10d
  cdq
  movq %rbp, %rsp
  popq %rbp
  ret

  .section .note.GNU-stack,"",@progbits
`;
  expect(asmCode).toEqual(expected);
});
