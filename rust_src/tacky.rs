//! The definition for the TACKY three address code IR used in the middle end

use crate::{ast, shared_types::Identifier};

/// TACKY Program representation
pub struct Program {
  pub function: Function,
}

/// TACKY Function representation
pub struct Function {
  pub name: Identifier,
  pub body: Vec<Instruction>,
}

/// TACKY Value representation
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
  IntConstant(i32),
  Var(Identifier),
}

/// TACKY Value representation
#[derive(Debug, Clone, PartialEq)]
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
    let comp = tacky::Instruction::Complement {
      src: c0.clone(),
      dst: var0.clone(),
    };
    let uminus = tacky::Instruction::UnaryMinus {
      src: c0.clone(),
      dst: var1.clone(),
    };
    let ret = tacky::Instruction::Return(var1.clone());
    let func = tacky::Function {
      name: Identifier::new("main"),
      body: vec![comp.clone(), uminus.clone(), ret.clone()],
    };
    assert_eq!(func.name, "main");
    assert_eq!(func.body.len(), 3);
    let prog = tacky::Program { function: func };
    assert_eq!(prog.function.name, "main");
    let _div_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Divide,
      lhs: c0.clone(),
      rhs: var0.clone(),
      dst: var1.clone(),
    };
    let _plus_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Plus,
      lhs: c0.clone(),
      rhs: var0.clone(),
      dst: var1.clone(),
    };
    let _minus_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Subtract,
      lhs: c0.clone(),
      rhs: var0.clone(),
      dst: var1.clone(),
    };
    let _times_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Multiply,
      lhs: c0.clone(),
      rhs: var0.clone(),
      dst: var1.clone(),
    };
    let _remainder_op = tacky::Instruction::BinaryOp {
      op: ast::BinaryOp::Remainder,
      lhs: c0.clone(),
      rhs: var0.clone(),
      dst: var1.clone(),
    };
    let _not = tacky::Instruction::LogicalNot {
      src: c0.clone(),
      dst: var0.clone(),
    };
    let label_name = Identifier::new("label1");
    let _label = tacky::Instruction::Label(label_name.clone());
    let _jmp = tacky::Instruction::Jump(label_name.clone());
    let _j0 = tacky::Instruction::JumpIfZero {
      cond: var1.clone(),
      target: label_name.clone(),
    };
    let _jn0 = tacky::Instruction::JumpIfNotZero {
      cond: c0.clone(),
      target: label_name.clone(),
    };
    let _cpy = tacky::Instruction::Copy {
      src: c0.clone(),
      dst: var0.clone(),
    };
  }
}
