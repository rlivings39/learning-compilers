import { test, expect } from "vitest";
import * as asm from "./asm";
import { lex } from "./lex";
import { parse } from "./parse";
import { astToTacky } from "./ast-to-tacky";

test("Assembly constructions", () => {
  const num = asm.ImmediateNumber(12);
  const reg = asm.Register("R10");
  const mv = asm.Move(num, reg);
  const ret = asm.Return();
  const func = asm.Function("main", [mv, ret]);
  const prog = asm.Program(func);
  const neg = asm.Neg(reg);
  const not = asm.Not(reg);
  const allocStack = asm.AllocateStack(12);
  const pseudo = asm.Pseudo("Pseudo1");
  const stack = asm.Stack(4);
  expect(prog.function_definition).toBe(func);
  expect(func.instructions).toHaveLength(2);
  expect(func.instructions).toEqual([mv, ret]);
  expect(mv.dst).toBe(reg);
  expect(mv.src).toBe(num);
  expect(num.value).toBe(12);
  expect(neg.inout).toBe(reg);
  expect(not.inout).toBe(reg);
  expect(allocStack.bytes).toEqual(12);
  expect(pseudo.id).toBe("Pseudo1");
  expect(stack.offset).toEqual(4);
});

test("AST to assembly", () => {
  const mainProg = `
  int main (void) {
    return 2;
  }`;
  const tokens = lex(mainProg);
  const ast = parse(tokens);
  const tacky = astToTacky(ast);
  const asmProg = asm.tackyToAsm(tacky);
  const func = asmProg.function_definition;
  expect(func.name).toBe("main");
  expect(func.instructions).toHaveLength(2);

  const instructions = func.instructions;
  expect(instructions[0].kind).toBe("move");
  expect(instructions[1].kind).toBe("return");
  const mv: asm.Move = instructions[0] as asm.Move;
  expect(mv.src.kind).toBe("number");
  expect(mv.dst.kind).toBe("register");
  const num = mv.src as asm.ImmediateNumber;
  expect(num.value).toBe(2);
});

test("MoveToStackTransform", () => {
  const mainProg = `
  int main (void) {
    return -2;
  }`;
  const tokens = lex(mainProg);
  const ast = parse(tokens);
  const tacky = astToTacky(ast);

  // Convert to asm and sanity check initial state
  const asmProg = asm.forTestingOnly.programToAsm(tacky);
  const instructions = asmProg.function_definition.instructions;
  expect(instructions).toHaveLength(4);
  expect(instructions.map((instr) => instr.kind)).toEqual([
    "move",
    "neg",
    "move",
    "return",
  ]);
  const tmpVal = (instructions[0] as asm.Move).dst;
  expect(tmpVal.kind).toBe("pseudo");

  // Run move to stack transform and ensure that pseudo register was
  // mapped to a single stack variable
  asm.forTestingOnly.moveToStack(asmProg);
  const instructionsOnStack = asmProg.function_definition.instructions;
  expect(instructionsOnStack).toHaveLength(4);
  expect(instructions.map((instr) => instr.kind)).toEqual([
    "move",
    "neg",
    "move",
    "return",
  ]);
  const tmpValStack = (instructions[0] as asm.Move).dst;
  expect(tmpValStack.kind).toBe("stack");
  const stackEntry = tmpValStack as asm.Stack;
  expect(stackEntry.offset).toEqual(-4);
  expect((instructions[1] as asm.Neg).inout).toEqual(stackEntry);
  expect((instructions[2] as asm.Move).src).toEqual(stackEntry);
  expect((instructions[2] as asm.Move).dst).toEqual(asm.Register("AX"));
});
