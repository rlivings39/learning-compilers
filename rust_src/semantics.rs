use std::fmt::format;

use crate::{ast, error::Error, shared_types::Identifier};

struct VariableResolution {}
impl VariableResolution {
  fn record_var_name(&mut self, name: &Identifier) -> Identifier {
    Identifier::new(&format!("{}_new", name.val()))
  }
  fn resolve_in_expr(&self, init: &mut ast::Expr) -> Result<(), Error> {
    todo!()
  }
  fn resolve_in_stmt(&self, stmt: &mut ast::Stmt) -> Result<(), String> {
    todo!()
  }
  fn resolve_in_block(&mut self, block: &mut ast::BlockItem) -> Result<(), Error> {
    match block {
      ast::BlockItem::Declaration(identifier, expr) => {
        let new_name = self.record_var_name(identifier);
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
  let mut resolver = VariableResolution {};
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
    Declaration(var_new);
  }
)
"#,
    );
  }
}
