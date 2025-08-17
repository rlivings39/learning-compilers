use crate::{ast, shared_types::Identifier};

const INDENT_INCREMENT: usize = 2;

fn print_line(line: &str, indent: usize) -> String {
  " ".repeat(indent).to_string() + line + "\n"
}

fn print_conditional(
  cond: &ast::ExprRef,
  true_expr: &ast::ExprRef,
  false_expr: &ast::ExprRef,
) -> String {
  format!(
    "Conditional({}, {}, {})",
    print_expr(cond.as_ref()),
    print_expr(true_expr.as_ref()),
    print_expr(false_expr.as_ref())
  )
}

fn print_assignment(left: &ast::ExprRef, right: &ast::ExprRef) -> String {
  format!(
    "=({}, {})",
    print_expr(left.as_ref()),
    print_expr(right.as_ref())
  )
}

fn print_var(name: &Identifier) -> String {
  format!("${name}")
}

fn print_binary(op: &ast::BinaryOp, left: &ast::ExprRef, right: &ast::ExprRef) -> String {
  format!(
    "{op:?}({}, {})",
    print_expr(left.as_ref()),
    print_expr(right.as_ref())
  )
}

fn print_unary(op: &ast::UnaryOperator, expr: &ast::ExprRef) -> String {
  format!("{op:?}({})", print_expr(expr.as_ref()))
}

fn print_expr(expr: &ast::Expr) -> String {
  match expr {
    ast::Expr::IntConstant(val) => format!("${val}"),
    ast::Expr::UnaryExpr(op, expr) => print_unary(op, expr),
    ast::Expr::BinaryExpr(binary_op, left, right) => print_binary(binary_op, left, right),
    ast::Expr::Var(name) => print_var(name),
    ast::Expr::Assignment(left, right) => print_assignment(left, right),
    ast::Expr::Conditional {
      cond,
      true_expr,
      false_expr,
    } => print_conditional(cond, true_expr, false_expr),
  }
}

fn print_declaration(id: &Identifier, init: &Option<ast::Expr>, indent: usize) -> String {
  let init_str = init
    .as_ref()
    .map_or("".to_string(), |e| format!(", {}", print_expr(e)));
  print_line(&format!("Declaration({}{});", id, init_str), indent)
}

fn print_if(
  cond: &ast::Expr,
  true_stmt: &Box<ast::Stmt>,
  false_stmt: &Option<Box<ast::Stmt>>,
  indent: usize,
) -> String {
  let mut res = print_line(&format!("If({}) {{", print_expr(cond)), indent);
  let child_indent = indent + INDENT_INCREMENT;
  res += &print_stmt(true_stmt, child_indent);
  if let Some(false_stmt) = false_stmt {
    res += &print_line("} Else {", indent);
    res += &print_stmt(false_stmt.as_ref(), child_indent);
  }
  res += &print_line("}", indent);
  res
}

fn print_stmt(stmt: &ast::Stmt, indent: usize) -> String {
  match stmt {
    ast::Stmt::Return(expr) => {
      let expr = print_expr(expr);
      print_line(&format!("return {};", expr), indent)
    }
    ast::Stmt::Expr(expr) => {
      let expr = print_expr(expr);
      print_line(&format!("{};", expr), indent)
    }
    ast::Stmt::Null => print_line(";", indent),
    ast::Stmt::If {
      cond,
      true_stmt,
      false_stmt,
    } => print_if(cond, true_stmt, false_stmt, indent),
  }
}

fn print_block(block: &ast::BlockItem, indent: usize) -> String {
  match &block {
    ast::BlockItem::Declaration(id, init) => print_declaration(id, init, indent),
    ast::BlockItem::Stmt(stmt) => print_stmt(&stmt, indent),
  }
}

fn print_function(func: &ast::Function, indent: usize) -> String {
  let body = func
    .body
    .iter()
    .map(|block| print_block(block, indent + INDENT_INCREMENT))
    .collect::<Vec<String>>()
    .join("");

  let mut ret = print_line(&format!("Function {}() {{", func.name), indent);
  ret += &body;
  ret += &print_line("}", indent);
  ret
}

fn print_program(prog: &ast::Program, indent: usize) -> String {
  let f = print_function(&prog.function, indent + INDENT_INCREMENT);
  format!(
    "{}{}{}",
    print_line("Program(", indent),
    f,
    print_line(")", indent)
  )
}

/// Pretty-print the given ast::Program to a String
pub fn pretty_print(prog: &ast::Program) -> String {
  print_program(prog, 0)
}

#[cfg(test)]
mod tests {
  use crate::{error::Error, lex, parse, source_files::SourceFile};

  use super::*;
  use pretty_assertions::assert_eq;

  fn run_pretty_printer(code: &str) -> Result<String, Error> {
    let source = SourceFile::new(code.to_string(), "bogus.c".to_string());
    let tokens = lex::lex(&source)?;
    let prog = parse::parse(&tokens, &source)?;
    Ok(pretty_print(&prog))
  }
  #[test]
  // This is a basic pretty printer test. The tests for the parser use the pretty
  // printer and also lock down output. So we don't duplicate those here.
  fn pretty_print_basic() {
    let code = r#"
int main(void) {
  int x;
  int y = 2;
  return y + 2;
}"#;
    assert_eq!(
      run_pretty_printer(code).unwrap(),
      r#"Program(
  Function main() {
    Declaration(x);
    Declaration(y, $2);
    return Plus($y, $2);
  }
)
"#
    );
  }
}
