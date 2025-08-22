//! Convert TACKY IR to ASM

use std::collections::HashMap;

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
      vec![asm::Instruction::Move { src, dst }]
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

struct MoveToStack {
  stack_size: i32,
  // Symbol to stack offset
  symbol_map: HashMap<String, i32>,
}
impl MoveToStack {
  fn new() -> MoveToStack {
    MoveToStack {
      stack_size: 0,
      symbol_map: HashMap::new(),
    }
  }

  fn to_stack(&mut self, val: &mut asm::Operand) {
    if let asm::Operand::Pseudo(id) = val {
      let offset = if let Some(offset) = self.symbol_map.get(id.val()) {
        *offset
      } else {
        self.stack_size += 4;
        self.symbol_map.insert(id.val().clone(), self.stack_size);
        self.stack_size
      };
      *val = asm::Operand::Stack(-offset);
    }
  }

  fn move_to_stack(&mut self, prog: &mut asm::Program) -> i32 {
    prog
      .function
      .instructions
      .iter_mut()
      .for_each(|instr| match instr {
        asm::Instruction::Neg(operand)
        | asm::Instruction::Not(operand)
        | asm::Instruction::Idiv(operand)
        | asm::Instruction::SetCC(_, operand) => self.to_stack(operand),
        asm::Instruction::Move { src, dst }
        | asm::Instruction::Binary { op: _, src, dst }
        | asm::Instruction::Cmp { src, dst } => {
          self.to_stack(src);
          self.to_stack(dst);
        }
        asm::Instruction::Return
        | asm::Instruction::AllocateStack(..)
        | asm::Instruction::Cdq
        | asm::Instruction::Jmp(..)
        | asm::Instruction::JmpCC(..)
        | asm::Instruction::Label(..) => (), // Nothing to do as there are no operands
      });
    self.stack_size
  }
}

/// Move stack operands to registers as needed to comply with x64 instruction rules.
/// Also prepends a stack allocation operation to function bodies
fn fix_stack_operands(prog: &mut asm::Program, stack_size: i32) {
  // TODO this function is way too big
  let instructions: &mut asm::InstructionVec = &mut prog.function.instructions;
  instructions.insert(
    0,
    asm::Instruction::AllocateStack(stack_size.try_into().unwrap()),
  );
  let mut new_instructions: asm::InstructionVec = Vec::new();
  instructions.iter_mut().for_each(|instr| match instr {
    asm::Instruction::Binary {
      op: asm::BinOp::Mul,
      dst: dst @ asm::Operand::Stack(..),
      ..
    } => {
      // Mul doesn't support stack argument for destination
      let reg11 = asm::Operand::Register(asm::RegId::R11);
      let stack_dst = dst.clone();
      let mv_stack_to_reg = asm::Instruction::Move {
        src: dst.clone(),
        dst: reg11.clone(),
      };
      *dst = reg11.clone();
      let mv_register_to_stack = asm::Instruction::Move {
        src: reg11,
        dst: stack_dst,
      };
      new_instructions.extend_from_slice(&[mv_stack_to_reg, instr.clone(), mv_register_to_stack]);
    }
    asm::Instruction::Cmp {
      dst: dst @ asm::Operand::Immediate(asm::Immediate::Int(..)),
      ..
    } => {
      // Cmp doesn't support constants as the destination
      let reg11 = asm::Operand::Register(asm::RegId::R11);
      let mv_reg11 = asm::Instruction::Move {
        src: dst.clone(),
        dst: reg11.clone(),
      };
      *dst = reg11;
      new_instructions.extend_from_slice(&[mv_reg11, instr.clone()]);
    }
    asm::Instruction::Move { src, dst, .. }
    | asm::Instruction::Binary { src, dst, .. }
    | asm::Instruction::Cmp { src, dst, .. } => {
      match (&src, &dst) {
        (asm::Operand::Stack(..), asm::Operand::Stack(..)) => {
          // If both operands are on the stack, use an
          // intermediate register:
          //
          // Move(Stack(-4), Stack(-8))
          //
          // becomes:
          //
          // Move(Stack(-4), Register)
          // Move(Register, Stack(-4))
          let reg = asm::Operand::Register(asm::RegId::R10);
          let mv_reg = asm::Instruction::Move {
            src: src.clone(),
            dst: reg.clone(),
          };
          *src = reg;
          new_instructions.extend_from_slice(&[mv_reg, instr.clone()]);
        }
        _ => new_instructions.push(instr.clone()),
      };
    }

    asm::Instruction::Idiv(operand @ asm::Operand::Immediate(..)) => {
      // Idiv can't take an immediate operand
      let reg = asm::Operand::Register(asm::RegId::R10);
      let mv_reg = asm::Instruction::Move {
        src: operand.clone(),
        dst: reg.clone(),
      };
      *operand = reg;
      new_instructions.extend_from_slice(&[mv_reg, instr.clone()]);
    }
    asm::Instruction::Return
    | asm::Instruction::Idiv(..)
    | asm::Instruction::Neg(..)
    | asm::Instruction::Not(..)
    | asm::Instruction::AllocateStack(..)
    | asm::Instruction::Cdq
    | asm::Instruction::Jmp(..)
    | asm::Instruction::JmpCC(..)
    | asm::Instruction::SetCC(..)
    | asm::Instruction::Label(..) => {
      // Nothing to do as these have 0 or 1 operand or special cases were handled above
      new_instructions.push(instr.clone())
    }
  });
  prog.function.instructions = new_instructions;
}

/// Move pseudo register operands to the stack. Returns needed stack space.
fn move_to_stack(prog: &mut asm::Program) -> i32 {
  let mut mts = MoveToStack::new();
  mts.move_to_stack(prog)
}

/// Convert TACKY IR to ASM
pub fn tacky_to_asm(prog: &tacky::Program) -> asm::Program {
  let mut asm_prog: asm::Program = program_to_asm(prog);
  let stack_size = move_to_stack(&mut asm_prog);
  fix_stack_operands(&mut asm_prog, stack_size);
  asm_prog
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{ast_to_tacky::ast_to_tacky, test_tools::run_parser_unwrap};
  use pretty_assertions::assert_eq;

  #[test]
  fn ast_to_asm() -> Result<(), Box<dyn std::error::Error>> {
    let main = "int main(void) { return 2; }";
    let ast = run_parser_unwrap(main);
    let tacky = ast_to_tacky(&ast);
    let prog = tacky_to_asm(&tacky);
    assert_eq!(prog.function.name, "main");
    // Expect 3 instructions: subq to allocate stack, movel to move output
    // into eax, ret to return
    match prog.function.instructions[..] {
      [
        asm::Instruction::AllocateStack(0),
        asm::Instruction::Move {
          src: asm::Operand::Immediate(asm::Immediate::Int(val)),
          dst: asm::Operand::Register(..),
        },
        asm::Instruction::Return,
      ] => assert_eq!(val, 2),
      _ => panic!(
        "Did not find expected instructions in {:?}",
        prog.function.instructions
      ),
    };
    Ok(())
  }

  #[test]
  fn pseudo_to_stack() {
    let mut prog = asm::Program {
      function: asm::Function {
        name: Identifier::new("main"),
        instructions: vec![asm::Instruction::Move {
          src: asm::Operand::Pseudo(Identifier::new("reg1")),
          dst: asm::Operand::Pseudo(Identifier::new("reg2")),
        }],
      },
    };
    let stack_size = move_to_stack(&mut prog);
    assert_eq!(stack_size, 8);
    match prog.function.instructions[..] {
      [
        asm::Instruction::Move {
          src: asm::Operand::Stack(-4),
          dst: asm::Operand::Stack(-8),
        },
      ] => ..,
      _ => panic!(
        "Operand not moved to stack: {:?}",
        prog.function.instructions
      ),
    };
  }

  #[test]
  fn binops() {
    let code = r#"
    int main (void) {
      return 1 + 2 * 3 - 4;
    }
    "#;
    let asm_prog = tacky_to_asm(&ast_to_tacky(&run_parser_unwrap(code)));
    let binops: Vec<&asm::Instruction> = asm_prog
      .function
      .instructions
      .iter()
      .filter(|instr| {
        if let asm::Instruction::Binary { .. } = instr {
          true
        } else {
          false
        }
      })
      .collect();
    // Ensure instructions are in the right order
    match binops[..] {
      [
        asm::Instruction::Binary {
          op: asm::BinOp::Mul,
          src: asm::Operand::Immediate(asm::Immediate::Int(3)),
          ..
        },
        asm::Instruction::Binary {
          op: asm::BinOp::Add,
          ..
        },
        asm::Instruction::Binary {
          op: asm::BinOp::Sub,
          ..
        },
      ] => ..,
      _ => panic!("BinOps not as expected {binops:?}"),
    };
  }

  // TODO finish porting tests
}
