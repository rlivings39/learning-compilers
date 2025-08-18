use std::collections::HashMap;

use crate::{ast, error::Error, shared_types::Identifier};

fn check_lvalue(expr: &ast::Expr) -> Result<(), Error> {
  // TODO error location
  match expr {
    ast::Expr::IntConstant(_)
    | ast::Expr::UnaryExpr(_, _)
    | ast::Expr::BinaryExpr(_, _, _)
    | ast::Expr::Assignment(_, _)
    | ast::Expr::Conditional {
      cond: _,
      false_expr: _,
      true_expr: _,
    } => Err(format!(
      "Non-lvalue of kind {} where lvalue is required",
      expr.kind_to_str()
    )),
    ast::Expr::Var(_) => Ok(()),
  }
}

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

  /// Resolve a variable name that has already been mangled
  fn resolve_var_name(&self, name: &Identifier) -> Result<&String, Error> {
    let new_name = self.var_table.get(name.val());
    new_name.ok_or(format!("Could not find identifier {}", name.val()))
  }

  /// Return a globally unique variable name to avoid collisions in ASM
  fn record_var_name(&mut self, name: &Identifier) -> Result<Identifier, Error> {
    let orig_name = name.val();
    let new_name = self.var_table.get(orig_name);
    if let Some(name) = new_name {
      return Err(format!("Variable {} already defined", name));
    }
    let new_name = format!("{}.{}", orig_name, self.var_index);
    self.var_index += 1;
    self
      .var_table
      .insert(orig_name.to_string(), new_name.clone());
    Ok(Identifier::new(&new_name))
  }

  fn resolve_in_expr(&self, expr: &mut ast::Expr) -> Result<(), Error> {
    match expr {
      ast::Expr::IntConstant(_) => Ok(()),
      ast::Expr::UnaryExpr(_, expr) => self.resolve_in_expr(expr),
      ast::Expr::BinaryExpr(_, lhs, rhs) => {
        self.resolve_in_expr(lhs)?;
        self.resolve_in_expr(rhs)
      }
      ast::Expr::Assignment(lhs, rhs) => {
        check_lvalue(lhs)?;
        self.resolve_in_expr(lhs)?;
        self.resolve_in_expr(rhs)
      }
      ast::Expr::Var(identifier) => {
        let new_name = self.resolve_var_name(&identifier)?;
        *identifier = Identifier::new(new_name);
        Ok(())
      }
      ast::Expr::Conditional {
        cond,
        true_expr,
        false_expr,
      } => {
        self.resolve_in_expr(cond)?;
        self.resolve_in_expr(true_expr)?;
        self.resolve_in_expr(false_expr)
      }
    }
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
  use crate::test_tools::{assert_prog_has_pretty_print, run_parser};
  use crate::{ast, shared_types::Identifier};

  #[track_caller]
  fn assert_has_pretty_print_after_semantics(code: &str, pretty_print: &str) {
    let prog = run_parser(code);
    let mut prog = match prog {
      Err(e) => panic!("{e}"),
      Ok(prog) => prog,
    };
    let res = run_semantic_analysis(&mut prog);
    if let Err(e) = res {
      panic!("{e}");
    }
    assert_prog_has_pretty_print(&prog, pretty_print);
  }

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

  #[test]
  fn variable_resolution() {
    let main = r#"
    int main(void) {
      int x = 0;
      int y;
      y = 2 + x;
      return !x + 3*y;
    }
    "#;
    let expected = r#"
Program(
  Function main() {
    Declaration(x.0, $0);
    Declaration(y.1);
    =($y.1, Plus($2, $x.0));
    return Plus(LogicalNot($x.0), Multiply($3, $y.1));
  }
)
    "#;
    assert_has_pretty_print_after_semantics(main, expected);
  }

  #[test]
  fn multiple_def_var() {
    let main = r#"
    int main(void) {
      int x;
      int x;
      return x;
    }
    "#;
    let err = run_semantic_analysis(&mut run_parser(main).unwrap()).unwrap_err();
    assert!(err.contains("already defined") && err.contains("x"));
  }

  #[test]
  fn no_def_var() {
    let main = r#"
    int main(void) {
      return x;
    }
    "#;
    let err = run_semantic_analysis(&mut run_parser(main).unwrap()).unwrap_err();
    assert!(err.contains("not find") && err.contains("x"));
  }

  #[test]
  fn if_cond_resolve() {
    let main = r#"
      int main(void) {
        int v = -2;
        int w = -1;
        int x = 0;
        int y = 1;
        int z = 2;
        if (w + 1)
          return x ? y : z;
        else
          return v;

        if (w)
          return v;

      }
    "#;
    let expected = r#"
Program(
  Function main() {
    Declaration(v.0, Minus($2));
    Declaration(w.1, Minus($1));
    Declaration(x.2, $0);
    Declaration(y.3, $1);
    Declaration(z.4, $2);
    If(Plus($w.1, $1)) {
      return Conditional($x.2, $y.3, $z.4);
    } Else {
      return $v.0;
    }
    If($w.1) {
      return $v.0;
    }
  }
)
    "#;
    assert_has_pretty_print_after_semantics(main, expected);
  }

  #[test]
  fn lvalue_check() -> Result<(), Error> {
    // Ensure we can assign to vars and nothing else
    let mut prog = run_parser("int main(void) { int x; x = 2; return x; }")
      .inspect_err(|err| panic!("{err}"))?;
    // This should pass
    assert!(run_semantic_analysis(&mut prog).is_ok());

    let mut prog = run_parser("int main(void) { int x; 3 = 2; return x; }")
      .inspect_err(|err| panic!("{err}"))?;
    // This should fail
    let err = run_semantic_analysis(&mut prog).expect_err("Lvalue check should have failed");
    assert!(err.contains("lvalue") && err.contains("Constant"));

    Ok(())
  }
}
