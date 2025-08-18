use std::{collections::HashMap, fmt::format, hash::Hash};

use crate::{ast, error::Error, shared_types::Identifier};

type VarTable = HashMap<String, String>;
struct VariableResolution {
  var_table: VarTable,
  var_index: i32,
}

impl VariableResolution {
  fn new() -> VariableResolution {
    VariableResolution {
      var_table: VarTable::new(),
      var_index: 0,
    }
  }
  fn record_var_name(&mut self, name: &Identifier) -> Result<Identifier, Error> {
    let new_name = self.var_table.get(name.val());
    if let Some(name) = new_name {
      return Err(format!("Variable {} already defined", name));
    }
    let new_name = format!("{}.{}", name.val(), self.var_index);
    self.var_index += 1;
    Ok(Identifier::new(&new_name))
  }

  fn resolve_in_expr(&self, init: &mut ast::Expr) -> Result<(), Error> {
    todo!()
  }
  fn resolve_in_stmt(&mut self, stmt: &mut ast::Stmt) -> Result<(), String> {
    match stmt {
      ast::Stmt::Return(expr) | ast::Stmt::Expr(expr) => self.resolve_in_expr(expr),
      ast::Stmt::Null => Ok(()),
      ast::Stmt::If {
        cond,
        true_stmt,
        false_stmt,
      } => {
        self.resolve_in_expr(cond)?;
        self.resolve_in_stmt(true_stmt)?;
        if let Some(stmt) = false_stmt {
          self.resolve_in_stmt(stmt)?;
        }
        Ok(())
      }
    }
  }
  fn resolve_in_block(&mut self, block: &mut ast::BlockItem) -> Result<(), Error> {
    match block {
      ast::BlockItem::Declaration(identifier, expr) => {
        let new_name = self.record_var_name(identifier)?;
        if let Some(init) = expr {
          self.resolve_in_expr(init)?;
        }
        *identifier = new_name;
        Ok(())
      }
      ast::BlockItem::Stmt(stmt) => self.resolve_in_stmt(stmt),
    }
  }
  pub fn resolve_vars(&mut self, prog: &mut ast::Program) -> Result<(), Error> {
    let res: Result<(), Error> = prog
      .function
      .body
      .iter_mut()
      .map(|block: &mut ast::BlockItem| self.resolve_in_block(block))
      .collect();
    res?;
    Ok(())
  }
}

/// Run semantic analysis which resolves variables, ensure assignments have valid lvalues, etc.
/// The result is a new ast::Program
/// TODO should I mutate?
pub fn run_semantic_analysis(prog: &mut ast::Program) -> Result<(), Error> {
  let mut resolver = VariableResolution::new();
  resolver.resolve_vars(prog)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::test_tools::assert_prog_has_pretty_print;
  use crate::{ast, shared_types::Identifier};
  use pretty_assertions::assert_eq;
  #[test]
  fn basic_var_resolve() {
    let decl = ast::BlockItem::Declaration(Identifier::new("var"), None);
    let func = ast::Function {
      body: vec![decl],
      name: Identifier::new("main"),
    };
    let mut prog = ast::Program { function: func };
    assert_prog_has_pretty_print(
      &prog,
      r#"
Program(
  Function main() {
    Declaration(var);
  }
)
"#,
    );

    run_semantic_analysis(&mut prog).unwrap();
    assert_prog_has_pretty_print(
      &prog,
      r#"
Program(
  Function main() {
    Declaration(var.0);
  }
)
"#,
    );
  }
}
