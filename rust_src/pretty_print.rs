use crate::{ast, shared_types::Identifier};

const INDENT_INCREMENT: usize = 2;

fn print_line(line: &str, indent: usize) -> String {
  " ".repeat(indent).to_string() + line + "\n"
}

fn print_expr(expr: &ast::Expr) -> String {
  "expr!".to_string()
}

fn print_declaration(id: &Identifier, init: &Option<ast::Expr>, indent: usize) -> String {
  let init_str = init.as_ref().map_or("".to_string(), |e| print_expr(e));
  print_line(&format!("Declaration ({}{});", id, init_str), indent)
}

fn print_stmt(stmt: &ast::Stmt, indent: usize) -> String {
  print_line("stmt!", indent)
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
    print_line("Program (", indent),
    f,
    print_line(")", indent)
  )
}

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
  fn pretty_print_basic() {
    let code = r#"
int main(void) {
  int x;
  return 2;
}"#;
    assert_eq!(
      run_pretty_printer(code).unwrap(),
      r#"Program (
  Function main() {
    Declaration (x);
    stmt!
  }
)
"#
    );
  }
}
