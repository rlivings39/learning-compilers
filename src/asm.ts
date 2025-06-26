import { Identifier } from "./ast";

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

export type Instruction = Move | Return;

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
