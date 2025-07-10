/**
 * TACKY IR definition
 */

import { BinaryOpName } from "./ast";
import { Identifier } from "./shared";

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
  src: Value;
};
export function Return(val: Value): Return {
  return { kind: "return", src: val };
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

export type LogicalNot = {
  kind: "logical-not";
  src: Value;
  dst: Assignable;
};
export function LogicalNot(src: Value, dst: Assignable): LogicalNot {
  return { kind: "logical-not", src, dst };
}

export type BinaryOp = {
  kind: "binary-expr";
  operator: BinaryOpName;
  lhs: Value;
  rhs: Value;
  dst: Assignable;
};
export function BinaryOp(
  operator: BinaryOpName,
  lhs: Value,
  rhs: Value,
  dst: Assignable
): BinaryOp {
  return { kind: "binary-expr", operator, lhs, rhs, dst };
}

export type Jump = {
  kind: "jump";
  target: Identifier;
};
export function Jump(target: Identifier): Jump {
  return { kind: "jump", target };
}

export type JumpIfZero = {
  kind: "jump-if-zero";
  condition: Value;
  target: Identifier;
};
export function JumpIfZero(condition: Value, target: Identifier): JumpIfZero {
  return { kind: "jump-if-zero", condition, target };
}

export type JumpIfNotZero = {
  kind: "jump-if-not-zero";
  condition: Value;
  target: Identifier;
};
export function JumpIfNotZero(
  condition: Value,
  target: Identifier
): JumpIfNotZero {
  return { kind: "jump-if-not-zero", condition, target };
}

export type Label = {
  kind: "label";
  name: Identifier;
};
export function Label(name: Identifier): Label {
  return { kind: "label", name };
}

export type Copy = {
  kind: "copy";
  src: Value;
  dst: Assignable;
};
export function Copy(src: Value, dst: Assignable): Copy {
  return { kind: "copy", src, dst };
}

export type UnaryOp = UnaryMinus | Complement | LogicalNot;

export type Instruction =
  | Return
  | UnaryOp
  | BinaryOp
  | Jump
  | JumpIfNotZero
  | JumpIfZero
  | Label
  | Copy;

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
