//! AST to TACKY IR conversion routines

use std::collections::HashSet;

use crate::{ast, shared_types::Identifier, tacky};

/// Converter object that does the work going from AST to TACKY
struct AstToTacky {
  label_set: HashSet<String>,
  var_idx: usize,
}

type InstructionVec = Vec<tacky::Instruction>;

impl AstToTacky {
  fn new() -> AstToTacky {
    AstToTacky {
      label_set: HashSet::new(),
      var_idx: 0,
    }
  }

  fn convert_program(&mut self, prog: &ast::Program) -> tacky::Program {
    let function = self.convert_function(&prog.function);
    return tacky::Program { function };
  }

  fn convert_function(&mut self, func: &ast::Function) -> tacky::Function {
    // let mut instructions: InstructionVec = func
    //   .body
    //   .iter()
    //   .flat_map(|block| self.convert_block_item(block))
    //   .collect();
    let mut instructions: InstructionVec = Vec::new();
    func
      .body
      .iter()
      .for_each(|block| self.convert_block_item(block, &mut instructions));

    // Tack (ha) on a return statement to handle cases
    // when main omits it or for void return. If func already
    // had a return statement this will be unreachable. We'll
    // delete it in future optimizations.
    if let Some(tacky::Instruction::Return(..)) = instructions.last() {
    } else {
      instructions.push(tacky::Instruction::Return(tacky::Value::IntConstant(0)));
    }
    let function = tacky::Function {
      body: instructions,
      name: func.name.clone(),
    };
    function
  }

  fn convert_block_item(&mut self, block: &ast::BlockItem, instructions: &mut InstructionVec) {
    match block {
      ast::BlockItem::Declaration(identifier, expr) => {
        if let Some(init) = expr {
          let var = tacky::Value::Var(identifier.clone());
          let init = self.convert_expr(init, instructions);
          instructions.push(tacky::Instruction::Copy {
            src: init,
            dst: var,
          })
        }
      }
      ast::BlockItem::Stmt(stmt) => self.convert_stmt(stmt, instructions),
    };
  }

  fn convert_stmt(&mut self, stmt: &ast::Stmt, instructions: &mut InstructionVec) {
    match stmt {
      ast::Stmt::Return(expr) => {
        let expr = self.convert_expr(expr, instructions);
        instructions.push(tacky::Instruction::Return(expr));
      }
      ast::Stmt::Expr(expr) => {
        self.convert_expr(expr, instructions);
      }
      ast::Stmt::Null => {
        // No runtime instructions needed
      }
      ast::Stmt::If {
        cond,
        true_stmt,
        false_stmt,
      } => self.convert_if_stmt(cond, true_stmt, false_stmt.as_ref(), instructions),
    };
  }
  fn convert_var(&self, identifier: &Identifier) -> tacky::Value {
    tacky::Value::Var(identifier.clone())
  }

  fn convert_assignment(
    &mut self,
    lhs: &ast::Expr,
    rhs: &ast::Expr,
    instructions: &mut InstructionVec,
  ) -> tacky::Value {
    let lhs_val = self.convert_expr(lhs, instructions);
    let rhs_val = self.convert_expr(rhs, instructions);
    instructions.push(tacky::Instruction::Copy {
      src: rhs_val,
      dst: lhs_val.clone(),
    });
    lhs_val
  }

  fn convert_conditional(
    &mut self,
    cond: &ast::Expr,
    true_expr: &ast::Expr,
    false_expr: &ast::Expr,
    instructions: &mut InstructionVec,
  ) -> tacky::Value {
    /* Here we set up something like
     *
     *  condition instructions..
     *  if cond == false jump to false label
     *  true instructions
     *  copy true value to result
     *  jump to end
     *  false label:
     *  false instructions
     *  copy false value to result
     *  end label
     */
    let res = self.make_temp();
    let end_name = "cond_end_label";
    let end_label = self.make_label(end_name);
    let false_name = "cond_false_label";
    let false_label = self.make_label(false_name);
    let mut true_instrs: InstructionVec = Vec::new();
    let true_val = self.convert_expr(true_expr, &mut true_instrs);
    let mut false_instrs: InstructionVec = Vec::new();
    let false_val = self.convert_expr(false_expr, &mut true_instrs);
    // Start instruction construction with condition value and instructions
    let cond_val = self.convert_expr(cond, instructions);
    instructions.push(tacky::Instruction::JumpIfZero {
      cond: cond_val,
      target: Identifier::new(false_name),
    });
    instructions.append(&mut true_instrs);
    instructions.extend_from_slice(&[
      tacky::Instruction::Copy {
        src: true_val,
        dst: res.clone(),
      },
      tacky::Instruction::Jump(Identifier::new(end_name)),
      false_label,
    ]);
    instructions.append(&mut false_instrs);
    instructions.extend_from_slice(&[
      tacky::Instruction::Copy {
        src: false_val,
        dst: res.clone(),
      },
      end_label,
    ]);
    res
  }

  fn convert_short_circuiting_binary(
    &mut self,
    binary_operator: &ast::BinaryOp,
    left: &ast::Expr,
    right: &ast::Expr,
    instructions: &mut InstructionVec,
  ) -> tacky::Value {
    // TODO describe IR structure
    // Collect the instructions for the left and right operands separately to be able to
    // properly implement short-circuiting
    let mut left_instrs: InstructionVec = Vec::new();
    let left = self.convert_expr(left, &mut left_instrs);
    let mut right_instrs: InstructionVec = Vec::new();
    let right = self.convert_expr(right, &mut right_instrs);
    let is_and = if let ast::BinaryOp::And = binary_operator {
      true
    } else {
      false
    };
    let target_name = if is_and { "false_label" } else { "true_label" };
    let target_id = Identifier::new(target_name);
    let short_circuit_label = self.make_label(target_name);
    let end_name = "end";
    let end_label = self.make_label(end_name);
    let jump_factory = if is_and {
      |cond, target| tacky::Instruction::JumpIfZero { cond, target }
    } else {
      |cond, target| tacky::Instruction::JumpIfNotZero { cond, target }
    };
    let first_jump = jump_factory(left, target_id.clone());
    let second_jump = jump_factory(right, target_id);
    let res = self.make_temp();
    let copy1 = tacky::Instruction::Copy {
      src: tacky::Value::IntConstant(if is_and { 1 } else { 0 }),
      dst: res.clone(),
    };
    let copy2 = tacky::Instruction::Copy {
      src: tacky::Value::IntConstant(if is_and { 0 } else { 1 }),
      dst: res.clone(),
    };
    instructions.append(&mut left_instrs);
    instructions.push(first_jump);
    instructions.append(&mut right_instrs);
    instructions.extend_from_slice(&[
      second_jump,
      copy1,
      tacky::Instruction::Jump(Identifier::new(end_name)),
      short_circuit_label,
      copy2,
      end_label,
    ]);
    return res;
  }

  fn convert_unary(
    &mut self,
    unary_operator: &ast::UnaryOperator,
    expr: &ast::Expr,
    instructions: &mut InstructionVec,
  ) -> tacky::Value {
    let src = self.convert_expr(expr, instructions);
    let dst = self.make_temp();
    let dst_clone = dst.clone();
    let instr = match unary_operator {
      ast::UnaryOperator::Complement => tacky::Instruction::Complement { src, dst },
      ast::UnaryOperator::Minus => tacky::Instruction::UnaryMinus { src, dst },
      ast::UnaryOperator::LogicalNot => tacky::Instruction::LogicalNot { src, dst },
    };
    instructions.push(instr);
    return dst_clone;
  }

  fn convert_binary(
    &mut self,
    binary_operator: &ast::BinaryOp,
    left: &ast::Expr,
    right: &ast::Expr,
    instructions: &mut InstructionVec,
  ) -> tacky::Value {
    // Handle the short-circuiting ops separately as they need special treatment
    match binary_operator {
      ast::BinaryOp::And | ast::BinaryOp::Or => {
        return self.convert_short_circuiting_binary(binary_operator, left, right, instructions);
      }
      _ => ..,
    };
    let tacky_left = self.convert_expr(left, instructions);
    let tacky_right = self.convert_expr(right, instructions);
    let dst = self.make_temp();
    let dst_clone = dst.clone();
    let instr = tacky::Instruction::BinaryOp {
      op: binary_operator.clone(),
      lhs: tacky_left,
      rhs: tacky_right,
      dst,
    };
    instructions.push(instr);
    return dst_clone;
  }

  fn convert_expr(&mut self, expr: &ast::Expr, instructions: &mut InstructionVec) -> tacky::Value {
    match expr {
      ast::Expr::IntConstant(val) => tacky::Value::IntConstant(*val),
      ast::Expr::UnaryExpr(unary_operator, expr) => {
        self.convert_unary(unary_operator, expr, instructions)
      }
      ast::Expr::BinaryExpr(binary_op, left, right) => {
        self.convert_binary(binary_op, left, right, instructions)
      }
      ast::Expr::Var(identifier) => self.convert_var(identifier),
      ast::Expr::Assignment(lhs, rhs) => self.convert_assignment(lhs, rhs, instructions),
      ast::Expr::Conditional {
        cond,
        true_expr,
        false_expr,
      } => self.convert_conditional(cond, true_expr, false_expr, instructions),
    }
  }

  fn convert_if_stmt(
    &mut self,
    cond: &ast::Expr,
    true_stmt: &ast::Stmt,
    false_stmt: Option<&Box<ast::Stmt>>,
    instructions: &mut InstructionVec,
  ) {
    let cond_val = self.convert_expr(cond, instructions);
    let end_name = "if_end_label";
    let end_label: tacky::Instruction = self.make_label(end_name);

    if let Some(false_stmt) = false_stmt {
      /*
       * With an else branch we emit something like
       *
       *   Condition instructions
       *   Jump to else if condition is 0
       *   True branch instructions
       *   Jump to end
       *   Else label
       *   False branch instructions
       *   End label
       */
      let else_name = "else_label";
      let else_label = self.make_label(else_name);
      let jump_else = tacky::Instruction::JumpIfZero {
        cond: cond_val,
        target: Identifier::new(else_name),
      };
      let jump_end = tacky::Instruction::Jump(Identifier::new(end_name));
      instructions.push(jump_else);
      self.convert_stmt(true_stmt, instructions);
      instructions.push(jump_end);
      instructions.push(else_label);
      self.convert_stmt(false_stmt, instructions);
      instructions.push(end_label);
    } else {
      // Without an else branch we just jump to the end label if the
      // condition is false and execute the true branch statements otherwise
      let jump_end = tacky::Instruction::JumpIfZero {
        cond: cond_val,
        target: Identifier::new(end_name),
      };
      instructions.push(jump_end);
      self.convert_stmt(true_stmt, instructions);
      instructions.push(end_label);
    }
  }

  fn make_label(&mut self, name: &str) -> tacky::Instruction {
    let mut counter = 0;
    let mut label_name: String = name.to_string();
    while self.label_set.contains(&label_name) {
      label_name = format!("{name}{counter}");
      counter += 1;
    }
    let label = tacky::Instruction::Label(Identifier::new(&label_name));
    self.label_set.insert(label_name);
    label
  }

  fn make_temp(&mut self) -> tacky::Value {
    let var = tacky::Value::Var(Identifier::new(&format!("notcc.tmp.{}", self.var_idx)));
    self.var_idx += 1;
    var
  }
}

/// Convert an ast::Program to a tacky::Program
pub fn ast_to_tacky(ast: &ast::Program) -> tacky::Program {
  let mut converter = AstToTacky::new();
  return converter.convert_program(ast);
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::pretty_print_tacky::pretty_print_tacky;
  use crate::semantics::run_semantic_analysis;
  use crate::test_tools::run_parser;
  use pretty_assertions::assert_eq;
  #[test]
  fn basic_tacky() -> Result<(), Box<dyn std::error::Error>> {
    let code = r#"
    int main(void) {
      int x = 2;
      int y;
      y = x + 3;
      if (y > 4)
        x = x + 1;
      else
        y = y - 1;

      return x+y;
    }
    "#;
    let mut prog = run_parser(code)?;
    run_semantic_analysis(&mut prog)?;
    let tacky = ast_to_tacky(&prog);
    assert_eq!(tacky.function.name, "main");
    assert!(pretty_print_tacky(&tacky).contains("main"));
    Ok(())
  }
}
