import * as ast from "./ast";
import { NotccError } from "./errors";

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

function exprToAsm(expr: ast.Expr): Operand {
  switch (expr.kind) {
    case "numeric-const": {
      return ImmediateNumber(expr.value);
    }
    case "string-const": {
      throw new NotccError("string-const not handled yet");
    }
    default: {
      const _check: never = expr;
      return _check;
    }
  }
}

function stmtToAsm(stmt: ast.Stmt): Instruction[] {
  const instructions: Instruction[] = [];
  // TODO pattern matching?
  if (stmt.kind === "return-stmt") {
    const num: Operand = exprToAsm(stmt.expr);
    const mv = Move(num, Register());
    const ret = Return();
    instructions.push(mv, ret);
  }
  return instructions;
}

function functionToAsm(func: ast.Function): Function {
  const name: ast.Identifier = func.name;
  const instructions: Instruction[] = [];
  instructions.push(...stmtToAsm(func.body));
  return Function(name, instructions);
}

function programToAsm(prog: ast.Program): Program {
  const func: Function = functionToAsm(prog.function_definition);
  return Program(func);
}

export function astToAsm(prog: ast.Program): Program {
  return programToAsm(prog);
}
