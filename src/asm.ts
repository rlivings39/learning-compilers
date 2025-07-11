import * as ast from "./ast";
import * as tacky from "./tacky";
import { Identifier } from "./shared";

export type ImmediateNumber = {
  kind: "number";
  value: number;
};

export function ImmediateNumber(value: number): ImmediateNumber {
  return { kind: "number", value };
}

export type Immediate = ImmediateNumber;

export type RegIds = "AX" | "R10" | "DX" | "R11";
export type Register = {
  kind: "register";
  reg: RegIds;
};

export function Register(reg: RegIds): Register {
  return { kind: "register", reg };
}

export type Pseudo = {
  kind: "pseudo";
  id: Identifier;
};
export function Pseudo(id: Identifier): Pseudo {
  return { kind: "pseudo", id };
}

export type Stack = {
  kind: "stack";
  offset: number;
};
export function Stack(offset: number): Stack {
  return { kind: "stack", offset };
}

export type Operand = Immediate | Register | Pseudo | Stack;

export type Move = {
  kind: "move";
  src: Operand;
  dst: Operand;
};

export function Move(src: Operand, dst: Operand): Move {
  return { kind: "move", src, dst };
}

export type Return = {
  kind: "return";
};

export function Return(): Return {
  return { kind: "return" };
}

export type Load = {
  kind: "load";
};

export type Neg = {
  kind: "neg";
  inout: Operand;
};
export function Neg(inout: Operand): Neg {
  return { kind: "neg", inout };
}
export type Not = {
  kind: "not";
  inout: Operand;
};
export function Not(inout: Operand): Not {
  return { kind: "not", inout };
}

export type AllocateStack = {
  kind: "allocate-stack";
  bytes: number;
};
export function AllocateStack(bytes: number): AllocateStack {
  return { kind: "allocate-stack", bytes };
}

type BinaryOpName = "add" | "sub" | "mul";

export type Binary = {
  kind: "binary-op";
  operator: BinaryOpName;
  src: Operand;
  dst: Operand;
};
export function Binary(
  operator: BinaryOpName,
  src: Operand,
  dst: Operand
): Binary {
  return { kind: "binary-op", operator, src, dst };
}

export type Idiv = {
  kind: "idiv";
  divisor: Operand;
};
export function Idiv(divisor: Operand): Idiv {
  return { kind: "idiv", divisor };
}

// Sign extend EAX into EDX
export type Cdq = {
  kind: "cdq";
};
export function Cdq(): Cdq {
  return { kind: "cdq" };
}

export type Cmp = {
  kind: "cmp";
  val1: Operand;
  val2: Operand;
};
export function Cmp(val1: Operand, val2: Operand): Cmp {
  return { kind: "cmp", val1, val2 };
}

export type Jmp = {
  kind: "jmp";
  target: Identifier;
};
export function Jmp(target: Identifier): Jmp {
  return { kind: "jmp", target };
}

export type ConditionCode = "E" | "NE" | "G" | "GE" | "L" | "LE";

export type JmpCC = {
  kind: "jmpcc";
  cond: ConditionCode;
  target: Identifier;
};
export function JmpCC(cond: ConditionCode, target: Identifier): JmpCC {
  return { kind: "jmpcc", cond, target };
}

export type SetCC = {
  kind: "setcc";
  cond: ConditionCode;
  dst: Operand;
};
export function SetCC(cond: ConditionCode, dst: Operand): SetCC {
  return { kind: "setcc", cond, dst };
}

export type Label = {
  kind: "label";
  name: Identifier;
};
export function Label(name: Identifier): Label {
  return { kind: "label", name };
}

export type UnaryOp = Neg | Not;
export type Instruction =
  | Move
  | Return
  | Neg
  | Not
  | AllocateStack
  | Binary
  | Idiv
  | Cdq
  | Cmp
  | Jmp
  | JmpCC
  | SetCC
  | Label;

export type Function = {
  name: Identifier;
  instructions: Instruction[];
};

export function Function(
  name: Identifier,
  instructions: Instruction[]
): Function {
  return { name, instructions };
}

export type Program = {
  function_definition: Function;
};

export function Program(function_definition: Function): Program {
  return { function_definition };
}

function valueToAsm(val: tacky.Value): Operand {
  switch (val.kind) {
    case "numeric-constant": {
      return ImmediateNumber(val.val);
    }
    case "var": {
      return Pseudo(val.name);
    }
  }
}

function simpleBinaryToAsm(
  opName: BinaryOpName,
  lhs: Operand,
  rhs: Operand,
  dst: Operand
): Instruction[] {
  const instructions: Instruction[] = [
    Move(lhs, dst),
    Binary(opName, rhs, dst),
  ];
  return instructions;
}

function divRemToAsm(
  opName: "divide" | "remainder",
  lhs: Operand,
  rhs: Operand,
  dst: Operand
): Instruction[] {
  const resultRegister: RegIds = opName === "divide" ? "AX" : "DX";

  const instructions: Instruction[] = [
    Move(lhs, Register("AX")),
    Cdq(),
    Idiv(rhs),
    Move(Register(resultRegister), dst),
  ];
  return instructions;
}

const RELOP_TO_CC: Record<ast.RelopName, ConditionCode> = {
  less: "L",
  "less-eq": "LE",
  greater: "G",
  "greater-eq": "GE",
  equal: "E",
  "not-equal": "NE",
};

type JmpName = tacky.JumpIfNotZero["kind"] | tacky.JumpIfZero["kind"];
const JUMP_TO_CC: Record<JmpName, ConditionCode> = {
  "jump-if-not-zero": "NE",
  "jump-if-zero": "E",
};

function jumpToAsm(
  jump: tacky.JumpIfNotZero | tacky.JumpIfZero
): Instruction[] {
  const instructions = [
    Cmp(ImmediateNumber(0), valueToAsm(jump.condition)),
    JmpCC(JUMP_TO_CC[jump.kind], jump.target),
  ];
  return instructions;
}

function relopToAsm(
  opName: ast.RelopName,
  lhs: Operand,
  rhs: Operand,
  dst: Operand
): Instruction[] {
  const instructions = [
    Cmp(lhs, rhs),
    Move(ImmediateNumber(0), dst),
    SetCC(RELOP_TO_CC[opName], dst),
  ];
  return instructions;
}

function unaryNotToAsm(not: tacky.LogicalNot): Instruction[] {
  const src = valueToAsm(not.src);
  const dst = valueToAsm(not.dst);
  const instructions = [Cmp(ImmediateNumber(0), src), SetCC("E", dst)];
  return instructions;
}

function instrToAsm(instr: tacky.Instruction): Instruction[] {
  const kind = instr.kind;
  switch (kind) {
    case "return": {
      const src = valueToAsm(instr.src);
      return [Move(src, Register("AX")), Return()];
    }
    case "unary-minus":
    case "complement": {
      const src = valueToAsm(instr.src);
      const dst = valueToAsm(instr.dst);
      const unary = instr.kind === "complement" ? Not : Neg;
      return [Move(src, dst), unary(dst)];
    }
    case "logical-not": {
      return unaryNotToAsm(instr);
    }
    case "jump": {
      return [Jmp(instr.target)];
    }
    case "jump-if-not-zero":
    case "jump-if-zero": {
      return jumpToAsm(instr);
    }
    case "label": {
      return [Label(instr.name)];
    }
    case "copy": {
      const src = valueToAsm(instr.src);
      const dst = valueToAsm(instr.dst);
      return [Move(src, dst)];
    }
    case "binary-expr": {
      const lhs = valueToAsm(instr.lhs);
      const rhs = valueToAsm(instr.rhs);
      const dst = valueToAsm(instr.dst);
      switch (instr.operator) {
        case "plus":
          return simpleBinaryToAsm("add", lhs, rhs, dst);
        case "multiply":
          return simpleBinaryToAsm("mul", lhs, rhs, dst);
        case "subtract": {
          return simpleBinaryToAsm("sub", lhs, rhs, dst);
        }
        case "less":
        case "less-eq":
        case "greater":
        case "greater-eq":
        case "equal":
        case "not-equal": {
          return relopToAsm(instr.operator, lhs, rhs, dst);
        }
        case "divide":
        case "remainder": {
          return divRemToAsm(instr.operator, lhs, rhs, dst);
        }
      }
      break;
    }
  }
}

function functionToAsm(func: tacky.Function): Function {
  const name: Identifier = func.name;
  const instructions: Instruction[] = [];
  func.body.forEach((instr) => {
    instructions.push(...instrToAsm(instr));
  });
  return Function(name, instructions);
}

function programToAsm(prog: tacky.Program): Program {
  const func: Function = functionToAsm(prog.func);
  return Program(func);
}

/**
 * Fix Move instructions where both operands are on
 * the stack. Prepends stack allocation instruction.
 * @param prog
 * @param stackOffset
 */
function fixupStackOperands(prog: Program, stackOffset: number) {
  const instructions = prog.function_definition.instructions;
  instructions.unshift(AllocateStack(stackOffset));
  const newInstructions: Instruction[] = [];
  instructions.forEach((instr) => {
    switch (instr.kind) {
      case "move":
      case "binary-op": {
        if (
          instr.kind === "binary-op" &&
          instr.operator === "mul" &&
          instr.dst.kind === "stack"
        ) {
          const reg11 = Register("R11");
          const stackDst = instr.dst;
          const mvStackToRegister = Move(instr.dst, reg11);
          instr.dst = reg11;
          const mvRegisterToStack = Move(reg11, stackDst);
          newInstructions.push(mvStackToRegister, instr, mvRegisterToStack);
        }
        // If both operands are on the stack, use an
        // intermediate register:
        //
        // Move(Stack(-4), Stack(-8))
        //
        // becomes:
        //
        // Move(Stack(-4), Register)
        // Move(Register, Stack(-4))
        else if (instr.dst.kind === "stack" && instr.src.kind === "stack") {
          const reg = Register("R10");
          const newMove = Move(instr.src, reg);
          instr.src = reg;
          newInstructions.push(newMove, instr);
        } else {
          newInstructions.push(instr);
        }
        break;
      }
      case "return":
      case "neg":
      case "not":
      case "allocate-stack":
      case "cdq": {
        // Nothing to do as these have 0 or 1 operands
        newInstructions.push(instr);
        break;
      }
      case "idiv": {
        // Idiv can't take an immediate operand
        if (instr.divisor.kind === "number") {
          const reg = Register("R10");
          newInstructions.push(Move(instr.divisor, reg));
          instr.divisor = reg;
        }
        newInstructions.push(instr);
        break;
      }
    }
  });
  prog.function_definition.instructions = newInstructions;
}

function toStack(
  val: Operand,
  stackOffset: number,
  symbolMap: Map<string, number>
) {
  let newOperand;
  if (val.kind === "pseudo") {
    const id = val.id;
    let offset = symbolMap.get(id);
    if (!offset) {
      stackOffset += 4;
      offset = stackOffset;
      symbolMap.set(id, offset);
    }
    newOperand = Stack(-offset);
  } else {
    newOperand = val;
  }
  return { newOperand, stackOffset };
}

/**
 * Moves pseudo register operands to the stack
 * @param prog
 * @returns The amount of stack space needed by the program
 */
function moveToStack(prog: Program): number {
  let stackOffset = 0;
  const symbolMap = new Map<string, number>();
  prog.function_definition.instructions.forEach((instr) => {
    switch (instr.kind) {
      case "move": {
        ({ newOperand: instr.src, stackOffset } = toStack(
          instr.src,
          stackOffset,
          symbolMap
        ));
        ({ newOperand: instr.dst, stackOffset } = toStack(
          instr.dst,
          stackOffset,
          symbolMap
        ));
        break;
      }
      case "allocate-stack":
      case "return":
      case "cdq": {
        // Nothing to do as there are no operands
        break;
      }
      case "neg":
      case "not": {
        ({ newOperand: instr.inout, stackOffset } = toStack(
          instr.inout,
          stackOffset,
          symbolMap
        ));
        break;
      }
      case "binary-op": {
        ({ newOperand: instr.dst, stackOffset } = toStack(
          instr.dst,
          stackOffset,
          symbolMap
        ));
        ({ newOperand: instr.src, stackOffset } = toStack(
          instr.src,
          stackOffset,
          symbolMap
        ));
        break;
      }
      case "idiv": {
        ({ newOperand: instr.divisor, stackOffset } = toStack(
          instr.divisor,
          stackOffset,
          symbolMap
        ));
        break;
      }
    }
  });
  return stackOffset;
}

/**
 * Convert a tacky program into an ASM program in preparation
 * for the emitter.
 * @param prog
 * @returns ASM program ready for the emitter
 */
export function tackyToAsm(prog: tacky.Program): Program {
  const asmProg = programToAsm(prog);
  const stackOffset = moveToStack(asmProg);
  fixupStackOperands(asmProg, stackOffset);
  return asmProg;
}

export const forTestingOnly = {
  programToAsm,
  moveToStack,
  fixupStackOperands,
};
