//! Notcc emitter for ASM code

use crate::asm;

const INDENT: &str = "  ";

enum UnOp {
  Neg,
  Not,
}

fn emit_instructions(instructions: &asm::InstructionVec) -> String {
  let mut res = "".to_string();
  instructions.iter().for_each(|instr| {
    res += INDENT;
    res += &match instr {
      asm::Instruction::Move { src, dst } => emit_move(src, dst),
      asm::Instruction::Return => emit_return(),
      asm::Instruction::Neg(operand) => emit_unary(UnOp::Neg, operand),
      asm::Instruction::Not(operand) => emit_unary(UnOp::Not, operand),
      asm::Instruction::AllocateStack(val) => emit_alloc_stack(*val),
      asm::Instruction::Binary { op, src, dst } => emit_binary(op, src, dst),
      asm::Instruction::Idiv(operand) => emit_idiv(operand),
      asm::Instruction::Cdq => emit_cdq(),
      asm::Instruction::Cmp { src, dst } => emit_cmp(src, dst),
      asm::Instruction::Jmp(identifier) => emit_jmp(identifier),
      asm::Instruction::JmpCC(condition_code, identifier) => emit_jpmcc(condition_code, identifier),
      asm::Instruction::SetCC(condition_code, operand) => emit_setcc(condition_code, operand),
      asm::Instruction::Label(identifier) => emit_label(identifier),
    };
    res += "\n";
  });
  res
}

fn emit_return() -> String {
  let asm = format!(
    "movq %rbp, %rsp
{INDENT}popq %rbp
{INDENT}ret"
  );
  asm
}

fn emit_unary(op: UnOp, operand: &asm::Operand) -> String {
  let instr = match op {
    UnOp::Neg => "negl",
    UnOp::Not => "notl",
  }
  .to_string();
  let op_asm = emit_operand(operand, 4);
  let asm = format!("{instr} {op_asm}");
  asm
}

fn emit_alloc_stack(size: usize) -> String {
  let asm = format!("subq ${size}, %rsp");
  asm
}

fn emit_binary(op: &asm::BinOp, src: &asm::Operand, dst: &asm::Operand) -> String {
  let instr = match op {
    asm::BinOp::Add => "addl",
    asm::BinOp::Sub => "subl",
    asm::BinOp::Mul => "imul",
  }
  .to_string();
  let src_asm = emit_operand(src, 4);
  let dst_asm = emit_operand(dst, 4);
  let asm = format!("{instr} {src_asm}, {dst_asm}");
  asm
}

fn emit_idiv(operand: &asm::Operand) -> String {
  let op_asm = emit_operand(operand, 4);
  let asm = format!("idiv {op_asm}");
  asm
}

fn emit_cdq() -> String {
  "cdq".to_string()
}

fn emit_cmp(src: &asm::Operand, dst: &asm::Operand) -> String {
  let src_asm = emit_operand(src, 4);
  let dst_asm = emit_operand(dst, 4);
  let asm = format!("cmpl {src_asm}, {dst_asm}");
  asm
}

fn emit_jmp(identifier: &crate::shared_types::Identifier) -> String {
  let target = mangle_label(identifier);
  let asm = format!("jmp {target}");
  asm
}

fn emit_jpmcc(
  condition_code: &asm::ConditionCode,
  identifier: &crate::shared_types::Identifier,
) -> String {
  let cc_str = cc_to_suffix(condition_code);
  let target = mangle_label(identifier);
  let asm = format!("jmp{cc_str} {target}");
  asm
}

fn emit_setcc(condition_code: &asm::ConditionCode, operand: &asm::Operand) -> String {
  let cc_str = cc_to_suffix(condition_code);
  let op_str = emit_operand(operand, 1);
  let asm = format!("set{cc_str} {op_str}");
  asm
}

fn cc_to_suffix(cc: &asm::ConditionCode) -> String {
  match cc {
    asm::ConditionCode::E => "e",
    asm::ConditionCode::NE => "ne",
    asm::ConditionCode::G => "g",
    asm::ConditionCode::GE => "ge",
    asm::ConditionCode::L => "l",
    asm::ConditionCode::LE => "le",
  }
  .to_string()
}
fn emit_label(identifier: &crate::shared_types::Identifier) -> String {
  let asm = mangle_label(identifier) + ":";
  asm
}

fn mangle_label(identifier: &crate::shared_types::Identifier) -> String {
  // TODO MAC uses L instead
  let asm = format!(".L{}", identifier.val());
  asm
}

fn emit_move(src: &asm::Operand, dst: &asm::Operand) -> String {
  let src_asm: String = emit_operand(src, 4);
  let dst_asm = emit_operand(dst, 4);
  let asm = format!("movl {src_asm}, {dst_asm}");
  asm
}

fn reg_to_asm(reg: &asm::RegId, size: usize) -> String {
  match reg {
    asm::RegId::AX => {
      if size == 1 {
        "%al"
      } else {
        "%eax"
      }
    }
    asm::RegId::R10 => {
      if size == 1 {
        "%r10b"
      } else {
        "%r10d"
      }
    }
    asm::RegId::DX => {
      if size == 1 {
        "%dl"
      } else {
        "%edx"
      }
    }
    asm::RegId::R11 => {
      if size == 1 {
        "%r11b"
      } else {
        "%r11d"
      }
    }
  }
  .to_string()
}

fn emit_operand(src: &asm::Operand, size: usize) -> String {
  let asm = match src {
    asm::Operand::Immediate(asm::Immediate::Int(val)) => format!("${val}"),
    asm::Operand::Register(reg_id) => reg_to_asm(reg_id, size),
    asm::Operand::Pseudo(..) => panic!("Pseudo registers should be lowered in tacky_to_asm"),
    asm::Operand::Stack(offset) => format!("{offset}(%rbp)"),
  };
  asm
}

fn emit_function(function: &asm::Function) -> String {
  let fname = &function.name;
  let mut res = format!(
    "{INDENT}.globl {fname}
{fname}:
{INDENT}pushq %rbp
{INDENT}movq %rsp, %rbp\n"
  );
  res += &emit_instructions(&function.instructions);
  res
}

fn emit_program(prog: &asm::Program) -> String {
  emit_function(&prog.function)
}

pub fn emit_asm(prog: &asm::Program) -> String {
  let mut res = emit_program(prog);
  res += INDENT;
  res += ".section .note.GNU-stack,\"\",@progbits\n";
  res
}
