import * as ast from "./ast";
import * as tacky from "./tacky";

export type ImmediateNumber = {
  kind: "number";
  value: number;
};

export function ImmediateNumber(value: number): ImmediateNumber {
  return { kind: "number", value };
}

export type Immediate = ImmediateNumber;

export type RegIds = "AX" | "R10";
export type Register = {
  kind: "register";
  reg: RegIds;
};

export function Register(reg: RegIds): Register {
  return { kind: "register", reg };
}

export type Pseudo = {
  kind: "pseudo";
  id: ast.Identifier;
};
export function Pseudo(id: ast.Identifier): Pseudo {
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

export type Instruction = Move | Return | Neg | Not | AllocateStack;

export type Function = {
  name: ast.Identifier;
  instructions: Instruction[];
};

export function Function(
  name: ast.Identifier,
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

function instrToAsm(instr: tacky.Instruction): Instruction[] {
  const instructions: Instruction[] = [];
  const kind = instr.kind;
  switch (kind) {
    case "return": {
      const src = valueToAsm(instr.src);
      instructions.push(Move(src, Register("AX")));
      instructions.push(Return());
      break;
    }
    case "unary-minus":
    case "complement": {
      const src = valueToAsm(instr.src);
      const dst = valueToAsm(instr.dst);
      instructions.push(Move(src, dst));
      const unary = instr.kind === "complement" ? Not : Neg;
      instructions.push(unary(dst));
      break;
    }
  }
  return instructions;
}

function functionToAsm(func: tacky.Function): Function {
  const name: ast.Identifier = func.name;
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

function fixupStackOperands(prog: Program, stackOffset: number) {
  const instructions = prog.function_definition.instructions;
  instructions.unshift(AllocateStack(stackOffset));
  const newInstructions: Instruction[] = [];
  instructions.forEach((instr) => {
    switch (instr.kind) {
      case "move": {
        // If both operands are on the stack, use an
        // intermediate register:
        //
        // Move(Stack(-4), Stack(-8))
        //
        // becomes:
        //
        // Move(Stack(-4), Register)
        // Move(Register, Stack(-4))
        if (instr.dst.kind === "stack" && instr.src.kind === "stack") {
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
      case "allocate-stack": {
        // Nothing to do as these have 0 or 1 operands
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
      case "return": {
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
    }
  });
  return stackOffset;
}

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
