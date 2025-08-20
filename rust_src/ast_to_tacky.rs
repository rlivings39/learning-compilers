//! AST to TACKY IR conversion routines

use crate::{ast, tacky};

/// Converter object that does the work going from AST to TACKY
struct AstToTacky {}

type InstructionVec = Vec<tacky::Instruction>;

impl AstToTacky {
  fn convert_program(&mut self, prog: &ast::Program) -> tacky::Program {
    let function = self.convert_function(&prog.function);
    return tacky::Program { function };
  }

  fn convert_function(&self, func: &ast::Function) -> tacky::Function {
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

  fn convert_block_item(&self, block: &ast::BlockItem, instructions: &mut InstructionVec) {
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

  fn convert_stmt(&self, stmt: &ast::Stmt, instructions: &mut InstructionVec) {
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
    todo!()
  }

  fn convert_expr(&self, expr: &ast::Expr, instructions: &mut InstructionVec) -> tacky::Value {
    todo!()
  }

  fn convert_if_stmt(
    &self,
    cond: &ast::Expr,
    true_stmt: &ast::Stmt,
    false_stmt: Option<&Box<ast::Stmt>>,
    instructions: &mut InstructionVec,
  ) {
    todo!()
  }
}

/// Convert an ast::Program to a tacky::Program
pub fn ast_to_tacky(ast: &ast::Program) -> tacky::Program {
  let mut converter = AstToTacky {};
  return converter.convert_program(ast);
}
