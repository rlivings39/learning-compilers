//! ASM IR

use crate::shared_types::Identifier;
#[derive(Debug, Clone)]
pub enum Immediate {
  Int(i32),
}

#[derive(Debug, Clone)]
pub enum RegId {
  AX,
  R10,
  DX,
  R11,
}

#[derive(Debug, Clone)]
pub enum Operand {
  Immediate(Immediate),
  Register(RegId),
  Pseudo(Identifier),
  Stack(i32),
}

#[derive(Debug, Clone)]
pub enum BinOp {
  Add,
  Sub,
  Mul,
}

#[derive(Debug, Clone)]
pub enum ConditionCode {
  E,
  NE,
  G,
  GE,
  L,
  LE,
}

#[derive(Debug, Clone)]
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
#[derive(Debug)]
pub struct Function {
  pub name: Identifier,
  pub instructions: InstructionVec,
}

#[derive(Debug)]
pub struct Program {
  pub function: Function,
}
