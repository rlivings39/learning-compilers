//! The definition for the TACKY three address code IR used in the middle end

use crate::{ast, shared_types::Identifier};

pub struct Program {
  pub function: Function,
}

pub struct Function {
  pub name: Identifier,
  pub body: Vec<Instruction>,
}

pub enum Value {
  IntConstant(i32),
  Var(Identifier),
}

pub enum Instruction {
  Return(Value),
  UnaryMinus {
    src: Value,
    dst: Value,
  },
  Complement {
    src: Value,
    dst: Value,
  },
  LogicalNot {
    src: Value,
    dst: Value,
  },
  BinaryOp {
    op: ast::BinaryOp,
    lhs: Value,
    rhs: Value,
    dst: Value,
  },
  Jump(Identifier),
  JumpIfZero {
    cond: Value,
    target: Identifier,
  },
  JumpIfNotZero {
    cond: Value,
    target: Identifier,
  },
  Label(Identifier),
  Copy {
    src: Value,
    dst: Value,
  },
}

#[cfg(test)]
mod tests {
  use crate::{ast, shared_types::Identifier, tacky};
  use pretty_assertions::assert_eq;
  #[test]
  fn construct_tacky() {
    let var0 = tacky::Value::Var(Identifier::new("tmp0"));
    let var1 = tacky::Value::Var(Identifier::new("tmp1"));
    let c0 = tacky::Value::IntConstant(37);
    let comp = tacky::Instruction::Complement { src: c0, dst: var0 };
    let uminus = tacky::Instruction::UnaryMinus { src: c0, dst: var1 };
    let ret = tacky::Instruction::Return(var1);
    let func = tacky::Function {
      name: Identifier::new("main"),
      body: vec![comp, uminus, ret],
    };
    let prog = tacky::Program { function: func };
    let div_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Divide,
      lhs: c0,
      rhs: var0,
      dst: var1,
    };
    let plus_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Plus,
      lhs: c0,
      rhs: var0,
      dst: var1,
    };
    let minus_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Subtract,
      lhs: c0,
      rhs: var0,
      dst: var1,
    };
    let times_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Multiply,
      lhs: c0,
      rhs: var0,
      dst: var1,
    };
    let remainder_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Remainder,
      lhs: c0,
      rhs: var0,
      dst: var1,
    };
    let not = tacky::Instruction::LogicalNot { src: c0, dst: var0 };
    let label_name = Identifier::new("label1");
    let label = tacky::Instruction::Label(label_name);
    let jmp = tacky::Instruction::Jump(label_name);
    let j0 = tacky::Instruction::JumpIfZero {
      cond: var1,
      target: label_name,
    };
    let jn0 = tacky::Instruction::JumpIfNotZero {
      cond: c0,
      target: label_name,
    };
  }
}
