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

export type Register = {
  kind: "register";
};

export function Register(): Register {
  return { kind: "register" };
}

export type Operand = Immediate | Register;

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

export type Instruction = Move | Return;

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
