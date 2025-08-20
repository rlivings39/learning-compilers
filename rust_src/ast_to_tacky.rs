//! AST to TACKY IR conversion routines

use std::collections::HashSet;

use crate::{ast, shared_types::Identifier, tacky};

/// Converter object that does the work going from AST to TACKY
struct AstToTacky {
  label_set: HashSet<String>,
}

type InstructionVec = Vec<tacky::Instruction>;

impl AstToTacky {
  fn new() -> AstToTacky {
    AstToTacky {
      label_set: HashSet::new(),
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

  fn convert_expr(&mut self, expr: &ast::Expr, instructions: &mut InstructionVec) -> tacky::Value {
    todo!()
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
}

/// Convert an ast::Program to a tacky::Program
pub fn ast_to_tacky(ast: &ast::Program) -> tacky::Program {
  let mut converter = AstToTacky::new();
  return converter.convert_program(ast);
}
