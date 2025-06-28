/**
 * TACKY IR definition
 */

import { Identifier } from "./ast";

export type Program = {
  func: Function;
};
export function Program(func: Function): Program {
  return { func };
}

export type Function = {
  name: Identifier;
  body: Instruction[];
};
export function Function(name: Identifier, body: Instruction[]): Function {
  return { name, body };
}

export type Return = {
  kind: "return";
  val: Value;
};
export function Return(val: Value): Return {
  return { kind: "return", val };
}

export type UnaryMinus = {
  kind: "unary-minus";
  src: Value;
  dst: Assignable;
};
export function UnaryMinus(src: Value, dst: Assignable): UnaryMinus {
  return { kind: "unary-minus", src, dst };
}

export type Complement = {
  kind: "complement";
  src: Value;
  dst: Assignable;
};
export function Complement(src: Value, dst: Assignable): Complement {
  return { kind: "complement", src, dst };
}

export type UnaryOp = UnaryMinus | Complement;

export type Instruction = Return | UnaryOp;

export type Constant = {
  kind: "numeric-constant";
  val: number;
};
export function Constant(val: number): Constant {
  return { kind: "numeric-constant", val };
}

export type Var = {
  kind: "var";
  name: Identifier;
};
export function Var(name: Identifier): Var {
  return { kind: "var", name };
}

/**
 * Values can store values and include things which cannot be written
 */
export type Value = Constant | Var;

/**
 * Assignable entities can be written to, i.e. be the `dst` of an operation
 */
export type Assignable = Var;
