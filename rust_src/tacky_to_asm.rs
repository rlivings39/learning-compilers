//! Convert TACKY IR to ASM

use crate::{asm, ast, shared_types::Identifier, tacky};

fn simple_binary_to_asm(
  op: &crate::ast::BinaryOp,
  lhs: asm::Operand,
  rhs: asm::Operand,
  dst: asm::Operand,
) -> Vec<asm::Instruction> {
  let asm_op = match op {
    crate::ast::BinaryOp::Plus => asm::BinOp::Add,
    crate::ast::BinaryOp::Multiply => asm::BinOp::Mul,
    crate::ast::BinaryOp::Subtract => asm::BinOp::Sub,
    _ => panic!("Unreachable"),
  };
  vec![
    asm::Instruction::Move {
      src: lhs,
      dst: dst.clone(),
    },
    asm::Instruction::Binary {
      op: asm_op,
      src: rhs,
      dst,
    },
  ]
}

fn div_rem_to_asm(
  op: DivRem,
  lhs: asm::Operand,
  rhs: asm::Operand,
  dst: asm::Operand,
) -> Vec<asm::Instruction> {
  let result_register = if let DivRem::Div = op {
    asm::RegId::AX
  } else {
    asm::RegId::DX
  };
  vec![
    asm::Instruction::Move {
      src: lhs,
      dst: asm::Operand::Register(asm::RegId::AX),
    },
    asm::Instruction::Cdq,
    asm::Instruction::Idiv(rhs),
    asm::Instruction::Move {
      src: asm::Operand::Register(result_register),
      dst,
    },
  ]
}

enum DivRem {
  Div,
  Rem,
}

fn relop_to_asm(
  cc: asm::ConditionCode,
  lhs: asm::Operand,
  rhs: asm::Operand,
  dst: asm::Operand,
) -> Vec<asm::Instruction> {
  vec![
    // TODO I said : Reverse operands for AT&T syntax
    asm::Instruction::Cmp { src: rhs, dst: lhs },
    asm::Instruction::Move {
      src: asm::Operand::Immediate(asm::Immediate::Int(0)),
      dst: dst.clone(),
    },
    asm::Instruction::SetCC(cc, dst),
  ]
}

fn binary_to_asm(
  op: &ast::BinaryOp,
  lhs: &tacky::Value,
  rhs: &tacky::Value,
  dst: &tacky::Value,
) -> Vec<asm::Instruction> {
  let lhs = val_to_asm(lhs);
  let rhs = val_to_asm(rhs);
  let dst = val_to_asm(dst);
  match op {
    ast::BinaryOp::Plus | ast::BinaryOp::Multiply | ast::BinaryOp::Subtract => {
      simple_binary_to_asm(op, lhs, rhs, dst)
    }
    ast::BinaryOp::Divide => div_rem_to_asm(DivRem::Div, lhs, rhs, dst),
    ast::BinaryOp::Remainder => div_rem_to_asm(DivRem::Rem, lhs, rhs, dst),
    ast::BinaryOp::And | ast::BinaryOp::Or => {
      panic!("The operators And/Or should have already been lowered")
    }
    ast::BinaryOp::Less => relop_to_asm(asm::ConditionCode::L, lhs, rhs, dst),
    ast::BinaryOp::LessEqual => relop_to_asm(asm::ConditionCode::LE, lhs, rhs, dst),
    ast::BinaryOp::Greater => relop_to_asm(asm::ConditionCode::G, lhs, rhs, dst),
    ast::BinaryOp::GreaterEqual => relop_to_asm(asm::ConditionCode::GE, lhs, rhs, dst),
    ast::BinaryOp::Equal => relop_to_asm(asm::ConditionCode::E, lhs, rhs, dst),
    ast::BinaryOp::NotEqual => relop_to_asm(asm::ConditionCode::NE, lhs, rhs, dst),
  }
}

fn val_to_asm(value: &tacky::Value) -> asm::Operand {
  match value {
    tacky::Value::IntConstant(val) => asm::Operand::Immediate(asm::Immediate::Int(*val)),
    tacky::Value::Var(identifier) => asm::Operand::Pseudo(identifier.clone()),
  }
}

fn jump_to_asm(
  cc: asm::ConditionCode,
  cond: &tacky::Value,
  target: &Identifier,
) -> asm::InstructionVec {
  let cond_asm = val_to_asm(cond);
  vec![
    asm::Instruction::Cmp {
      src: asm::Operand::Immediate(asm::Immediate::Int(0)),
      dst: cond_asm,
    },
    asm::Instruction::JmpCC(cc, target.clone()),
  ]
}

fn instr_to_asm(instr: &tacky::Instruction) -> asm::InstructionVec {
  match instr {
    tacky::Instruction::Return(value) => {
      let src: asm::Operand = val_to_asm(value);
      vec![
        asm::Instruction::Move {
          src,
          dst: asm::Operand::Register(asm::RegId::AX),
        },
        asm::Instruction::Return,
      ]
    }
    tacky::Instruction::UnaryMinus { src, dst } | tacky::Instruction::Complement { src, dst } => {
      let src = val_to_asm(src);
      let dst = val_to_asm(dst);
      let unary = if let tacky::Instruction::UnaryMinus { .. } = instr {
        asm::Instruction::Neg(dst.clone())
      } else {
        asm::Instruction::Not(dst.clone())
      };
      vec![asm::Instruction::Move { src, dst: dst }, unary]
    }
    tacky::Instruction::LogicalNot { src, dst } => {
      let src = val_to_asm(src);
      let dst = val_to_asm(dst);
      vec![
        asm::Instruction::Cmp {
          src: asm::Operand::Immediate(asm::Immediate::Int(0)),
          dst: src,
        },
        asm::Instruction::SetCC(asm::ConditionCode::E, dst),
      ]
    }
    tacky::Instruction::BinaryOp { op, lhs, rhs, dst } => binary_to_asm(op, lhs, rhs, dst),
    tacky::Instruction::Jump(identifier) => vec![asm::Instruction::Jmp(identifier.clone())],
    tacky::Instruction::JumpIfZero { cond, target } => {
      jump_to_asm(asm::ConditionCode::E, cond, target)
    }
    tacky::Instruction::JumpIfNotZero { cond, target } => {
      jump_to_asm(asm::ConditionCode::NE, cond, target)
    }
    tacky::Instruction::Label(identifier) => vec![asm::Instruction::Label(identifier.clone())],
    tacky::Instruction::Copy { src, dst } => {
      let src = val_to_asm(src);
      let dst = val_to_asm(dst);
      vec![asm::Instruction::Move { src: src, dst: dst }]
    }
  }
}

fn function_to_asm(function: &tacky::Function) -> asm::Function {
  let instructions: Vec<asm::Instruction> = function
    .body
    .iter()
    .flat_map(|instr| instr_to_asm(instr))
    .collect();
  asm::Function {
    name: function.name.clone(),
    instructions,
  }
}

fn program_to_asm(prog: &tacky::Program) -> asm::Program {
  let func: asm::Function = function_to_asm(&prog.function);
  asm::Program { function: func }
}

/// Convert TACKY IR to ASM
pub fn tacky_to_asm(prog: &tacky::Program) -> asm::Program {
  let asm_prog: asm::Program = program_to_asm(prog);

  asm_prog
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{ast_to_tacky::ast_to_tacky, test_tools::run_parser};
  use pretty_assertions::assert_eq;

  #[test]
  fn ast_to_asm() -> Result<(), Box<dyn std::error::Error>> {
    let main = "int main(void) { return 2; }";
    let ast = run_parser(main)?;
    let tacky = ast_to_tacky(&ast);
    let prog = tacky_to_asm(&tacky);
    assert_eq!(prog.function.name, "main");
    // Expect 3 instructions: subq to allocate stack, movel to move output
    // into eax, ret to return
    match prog.function.instructions[..] {
      [
        asm::Instruction::Move {
          src: asm::Operand::Immediate(asm::Immediate::Int(val)),
          dst: asm::Operand::Register(..),
        },
        asm::Instruction::Return, // TODO stack
      ] => assert_eq!(val, 2),
      _ => panic!(
        "Did not find expected instructions in {:?}",
        prog.function.instructions
      ),
    };
    Ok(())
  }
}
