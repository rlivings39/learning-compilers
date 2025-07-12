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
  const add = asm.Binary("add", num, reg);
  const sub = asm.Binary("sub", num, reg);
  const mul = asm.Binary("mul", num, reg);
  const cmp = asm.Cmp(num, reg);
  const label = asm.Label("a_label");
  const jmp = asm.Jmp(label.name);
  const jmpcc = asm.JmpCC("E", label.name);
  const setcc = asm.SetCC("NE", reg);
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
  expect(add.operator).toBe("add");
  expect(add.dst).toBe(reg);
  expect(add.src).toBe(num);
  expect(add.kind).toBe("binary-op");
  expect(sub.operator).toBe("sub");
  expect(sub.dst).toBe(reg);
  expect(sub.src).toBe(num);
  expect(sub.kind).toBe("binary-op");
  expect(mul.operator).toBe("mul");
  expect(mul.dst).toBe(reg);
  expect(mul.src).toBe(num);
  expect(mul.kind).toBe("binary-op");
  expect(cmp.kind).toBe("cmp");
  expect(cmp.src).toBe(num);
  expect(cmp.dst).toBe(reg);
  expect(jmp.kind).toBe("jmp");
  expect(jmp.target).toBe(label.name);
  expect(jmpcc.kind).toBe("jmpcc");
  expect(jmpcc.cond).toBe("E");
  expect(jmpcc.target).toBe(label.name);
  expect(setcc.kind).toBe("setcc");
  expect(setcc.cond).toBe("NE");
  expect(setcc.dst).toBe(reg);
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
  // Expect 3 instructions: subq to allocate stack, movel to move output
  // into eax, ret to return
  expect(func.instructions, JSON.stringify(func, null, 2)).toHaveLength(3);

  const instructions = func.instructions;
  expect(instructions.map((i) => i.kind)).toEqual([
    "allocate-stack",
    "move",
    "return",
  ]);
  const mv: asm.Move = instructions[1] as asm.Move;
  expect(mv.src.kind).toBe("number");
  expect(mv.dst.kind).toBe("register");
  const num = mv.src as asm.ImmediateNumber;
  expect(num.value).toBe(2);
});

test("AST to assembly w/ binops", () => {
  const main = `
  int main (void) {
    return 1 + 2 * 3 - 4;
  }`;
  const asmProg = asm.tackyToAsm(astToTacky(parse(lex(main))));
  expect(
    asmProg.function_definition.instructions,
    JSON.stringify(asmProg, null, 2)
  ).toHaveLength(13);
  const instructions = asmProg.function_definition.instructions;
  // Ensure operations are in the right order
  const binOps = instructions.filter((i) => i.kind === "binary-op");
  expect(binOps.map((b) => b.operator)).toEqual(["mul", "add", "sub"]);
  expect(binOps[0].src.kind).toEqual("number");
  expect((binOps[0].src as asm.ImmediateNumber).value).toEqual(3);
});

test("AST to assembly div/rem", () => {
  const main = `
  int main (void) {
    return 1 / 2 % 3;
  }`;
  const asmProg = asm.tackyToAsm(astToTacky(parse(lex(main))));
  expect(
    asmProg.function_definition.instructions,
    JSON.stringify(asmProg, null, 2)
  ).toHaveLength(13);
  const instructions = asmProg.function_definition.instructions;
  // Ensure operations are in the right order
  const divIndices: number[] = [];
  const divOps = instructions.filter((i, idx) => {
    const isDiv = i.kind === "idiv";
    if (isDiv) {
      divIndices.push(idx);
    }
    return isDiv;
  });

  expect(divOps).toHaveLength(2);
  // Ensure that idiv operands are sane
  expect(divOps[0].divisor.kind).toEqual("register");
  expect(divOps[1].divisor.kind).toEqual("register");

  // Ensure that we read the result from the right registers for div/rem
  expect(instructions[divIndices[0] + 1].kind).toBe("move");
  expect((instructions[divIndices[0] + 1] as asm.Move).src).toEqual(
    asm.Register("AX")
  );
  expect(instructions[divIndices[1] + 1].kind).toBe("move");
  expect((instructions[divIndices[1] + 1] as asm.Move).src).toEqual(
    asm.Register("DX")
  );
});

test("AST to assembly cmp rewrites", () => {
  // Ensure that cmp doesn't have a constant as the 2nd operand
  const main = `int main(void) {
    return 1 < 2;
  }`;
  const asmProg = asm.tackyToAsm(astToTacky(parse(lex(main))));
  const instructions = asmProg.function_definition.instructions;
  expect(instructions, JSON.stringify(instructions, null, 2)).not.toBeNull();
  const cmpIdx = instructions.findIndex((i) => i.kind === "cmp");
  expect(cmpIdx, "No cmp instruction found").not.toEqual(-1);
  const cmp = instructions[cmpIdx] as asm.Cmp;
  expect(cmp.dst.kind).toEqual("register");
  const setInst = instructions.filter((i) => i.kind === "setcc");
  expect(setInst).toHaveLength(1);
  expect(setInst[0].cond).toBe("L");
});

test("AST to assembly jmp, set, relops", () => {
  const main = `int main(void) {
    return 1 < 2 && 2 <= 3 && 4 > 5 && 6 >= 7 && 8 != 9 || 10 == 11;
  }`;
  const asmProg = asm.tackyToAsm(astToTacky(parse(lex(main))));
  const instructions = asmProg.function_definition.instructions;
  // TODO more tests
  expect(instructions).toHaveLength(72);
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
  const stackOffset = asm.forTestingOnly.moveToStack(asmProg);
  expect(stackOffset).toEqual(4);
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

test("MoveFixupStackOperands", () => {
  const mainProg = `
  int main (void) {
    return -(~2);
  }`;
  const tokens = lex(mainProg);
  const ast = parse(tokens);
  const tacky = astToTacky(ast);

  // Convert to asm and sanity check initial state
  const asmProg = asm.forTestingOnly.programToAsm(tacky);
  const stackOffset = asm.forTestingOnly.moveToStack(asmProg);
  let instructions = asmProg.function_definition.instructions;
  expect(instructions.map((i) => i.kind)).toEqual([
    "move",
    "not",
    "move",
    "neg",
    "move",
    "return",
  ]);
  const badMove = instructions[2] as asm.Move;
  expect(badMove.dst.kind).toBe("stack");
  expect(badMove.src.kind).toBe("stack");

  // Now run stack fixup transform and verify results
  asm.forTestingOnly.fixupStackOperands(asmProg, stackOffset);
  instructions = asmProg.function_definition.instructions;
  expect(instructions.map((i) => i.kind)).toEqual([
    "allocate-stack",
    "move",
    "not",
    "move",
    "move",
    "neg",
    "move",
    "return",
  ]);

  const newMove1 = instructions[3] as asm.Move;
  const newMove2 = instructions[4] as asm.Move;
  expect(newMove1.src.kind).toBe("stack");
  expect(newMove1.dst.kind).toBe("register");
  expect(newMove2.src.kind).toBe("register");
  expect(newMove2.dst.kind).toBe("stack");
  expect(newMove1.dst).toEqual(newMove2.src);
});
