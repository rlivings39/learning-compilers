//! ASM IR

use crate::shared_types::Identifier;

pub enum Immediate {
  ImmediateInt(i32),
}

pub enum RegId {
  AX,
  R10,
  DX,
  R11,
}

pub enum Operand {
  Immediate(Immediate),
  Register(RegId),
  Pseudo(Identifier),
  Stack(usize),
}

pub enum BinOp {
  Add,
  Sub,
  Mul,
}

pub enum ConditionCode {
  E,
  NE,
  G,
  GE,
  L,
  LE,
}

pub enum Instruction {
  Move {
    src: Operand,
    dst: Operand,
  },
  Return,
  Neg(Operand),
  Not(Operand),
  AllocateStack(usize),
  Binary {
    op: BinOp,
    src: Operand,
    dst: Operand,
  },
  Idiv(Operand),
  Cdq, // sign extends EAX into EDX
  Cmp {
    src: Operand,
    dst: Operand,
  },
  Jmp(Identifier),
  JmpCC(ConditionCode, Identifier),
  SetCC(ConditionCode, Operand),
  Label(Identifier),
}

pub type InstructionVec = Vec<Instruction>;
pub struct Function {
  name: Identifier,
  instructions: InstructionVec,
}

pub struct Program {
  function: Function,
}
