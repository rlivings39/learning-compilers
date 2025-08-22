//! Pretty printer for TACKY IR

use crate::shared_types::Identifier;
use crate::tacky;
const INDENT_OFFSET: usize = 2;
struct Printer {
  indent_size: usize,
}

impl Printer {
  fn new() -> Printer {
    Printer { indent_size: 0 }
  }

  fn indent(&mut self) {
    self.indent_size += INDENT_OFFSET
  }

  fn unindent(&mut self) {
    self.indent_size -= INDENT_OFFSET
  }

  fn indent_str(&self, text: &str) -> String {
    format!("{}{text}", " ".repeat(self.indent_size))
  }

  fn print_line(&self, text: &str) -> String {
    self.indent_str(text) + "\n"
  }

  fn print_program(&mut self, prog: &tacky::Program) -> String {
    self.print_function(&prog.function)
  }

  fn print_function(&mut self, function: &tacky::Function) -> String {
    let mut res = self.print_line(&format!("Function {} () {{", function.name));
    self.indent();
    for instr in &function.body {
      res += &self.print_instruction(instr);
    }
    self.unindent();
    res += &self.indent_str("}");
    res
  }

  fn print_instruction(&self, instr: &tacky::Instruction) -> String {
    match instr {
      tacky::Instruction::Return(value) => self.print_return(value),
      tacky::Instruction::UnaryMinus { src, dst } => self.print_unary("Uminus", src, dst),
      tacky::Instruction::Complement { src, dst } => self.print_unary("BitComp", src, dst),
      tacky::Instruction::LogicalNot { src, dst } => self.print_unary("Not", src, dst),
      tacky::Instruction::BinaryOp { op, lhs, rhs, dst } => self.print_binary(op, lhs, rhs, dst),
      tacky::Instruction::Jump(identifier) => self.print_jump(identifier),
      tacky::Instruction::JumpIfZero { cond, target } => {
        self.print_cond_jump("JumpIfZero", cond, target)
      }
      tacky::Instruction::JumpIfNotZero { cond, target } => {
        self.print_cond_jump("JumpIfNotZero", cond, target)
      }
      tacky::Instruction::Label(identifier) => self.print_label(identifier),
      tacky::Instruction::Copy { src, dst } => self.print_copy(src, dst),
    }
  }

  fn print_return(&self, value: &tacky::Value) -> String {
    let val = self.print_value(value);
    self.print_line(&format!("Return({val})"))
  }

  fn print_unary(&self, op: &str, src: &tacky::Value, dst: &tacky::Value) -> String {
    let src_str = self.print_value(src);
    let dst_str = self.print_value(dst);
    self.print_line(&format!("{op}({src_str}, {dst_str})"))
  }

  fn print_binary(
    &self,
    op: &crate::ast::BinaryOp,
    lhs: &tacky::Value,
    rhs: &tacky::Value,
    dst: &tacky::Value,
  ) -> String {
    let lhs_str = self.print_value(lhs);
    let rhs_str = self.print_value(rhs);
    let dst_str = self.print_value(dst);
    self.print_line(&format!("{op:?}({lhs_str},{rhs_str},{dst_str})"))
  }

  fn print_jump(&self, identifier: &Identifier) -> String {
    self.print_line(&format!("Jump({identifier})"))
  }

  fn print_cond_jump(&self, jump_name: &str, cond: &tacky::Value, target: &Identifier) -> String {
    let cond_str = self.print_value(cond);
    self.print_line(&format!("{jump_name}({cond_str}, {target})"))
  }

  fn print_label(&self, identifier: &Identifier) -> String {
    self.print_line(&format!("Label({identifier})"))
  }

  fn print_copy(&self, src: &tacky::Value, dst: &tacky::Value) -> String {
    let src_str = self.print_value(src);
    let dst_str = self.print_value(dst);
    self.print_line(&format!("Copy({src_str}, {dst_str})"))
  }

  fn print_value(&self, value: &tacky::Value) -> String {
    match value {
      tacky::Value::IntConstant(val) => format!("${val}"),
      tacky::Value::Var(identifier) => format!("%{identifier}"),
    }
  }
}

/// Pretty print a given tacky program to a String
pub fn pretty_print_tacky(prog: &tacky::Program) -> String {
  let mut printer = Printer::new();
  printer.print_program(prog)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{
    ast_to_tacky::ast_to_tacky,
    semantics::run_semantic_analysis,
    test_tools::{run_parser, run_parser_unwrap},
  };
  use pretty_assertions::assert_eq;
  #[test]
  fn print_basic() -> Result<(), Box<dyn std::error::Error>> {
    let main = "int main(void) { return -(~(-(-(4)))); }";
    let mut ast = run_parser_unwrap(main);
    run_semantic_analysis(&mut ast)?;
    let tacky = ast_to_tacky(&ast);
    let tacky_str = pretty_print_tacky(&tacky);
    let expected = r#"
Function main () {
  Uminus($4, %notcc.tmp.0)
  Uminus(%notcc.tmp.0, %notcc.tmp.1)
  BitComp(%notcc.tmp.1, %notcc.tmp.2)
  Uminus(%notcc.tmp.2, %notcc.tmp.3)
  Return(%notcc.tmp.3)
}
    "#;
    assert_eq!(tacky_str.trim(), expected.trim());
    Ok(())
  }

  #[test]
  fn print_binops_basic() -> Result<(), Box<dyn std::error::Error>> {
    let main = "int main(void) { return 1 % 5 + 2 * 3 / 4; }";
    let mut ast = run_parser_unwrap(main);
    run_semantic_analysis(&mut ast)?;
    let tacky = ast_to_tacky(&ast);
    let tacky_str = pretty_print_tacky(&tacky);
    let expected = r#"
Function main () {
  Remainder($1,$5,%notcc.tmp.0)
  Multiply($2,$3,%notcc.tmp.1)
  Divide(%notcc.tmp.1,$4,%notcc.tmp.2)
  Plus(%notcc.tmp.0,%notcc.tmp.2,%notcc.tmp.3)
  Return(%notcc.tmp.3)
}
  "#;
    assert_eq!(tacky_str.trim(), expected.trim());
    Ok(())
  }
}
