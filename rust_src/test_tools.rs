//! Test tools for notcc. This module is only added in `#[cfg(test)]`
use crate::{
  ast, ast_to_tacky, error::Error, lex, parse, pretty_print,
  pretty_print_tacky::pretty_print_tacky, semantics::run_semantic_analysis,
  source_files::SourceFile,
};
use pretty_assertions::assert_eq;

/// Run the parser on a code string and return the resulting program or error
pub fn run_parser(code: &str) -> Result<ast::Program, Error> {
  let source = SourceFile::new(code.to_string(), "bogus.c".to_string());
  let tokens = lex::lex(&source)?;
  parse::parse(&tokens, &source)
}

/// Parse the given code string and ensure that its pretty print matches pretty_print
#[track_caller]
pub fn assert_has_pretty_print(code: &str, pretty_print: &str) {
  let prog = match run_parser(code.trim()) {
    Ok(prog) => prog,
    // Panic here because it gives better error locations and diagnostics
    Err(e) => panic!("{e}"),
  };
  assert_prog_has_pretty_print(&prog, pretty_print);
}

/// Parse the given code string to TACKY and ensure that its pretty print matches pretty_print
#[track_caller]
pub fn assert_tacky_has_pretty_print(code: &str, pretty_print: &str) {
  let mut prog = match run_parser(code.trim()) {
    Ok(prog) => prog,
    // Panic here because it gives better error locations and diagnostics
    Err(e) => panic!("{e}"),
  };
  match run_semantic_analysis(&mut prog) {
    Err(e) => panic!("{e}"),
    Ok(..) => ..,
  };
  let tacky = ast_to_tacky::ast_to_tacky(&prog);
  let tacky_str = pretty_print_tacky(&tacky);
  assert_eq!(tacky_str.trim(), pretty_print.trim());
}

/// Ensure that prog's pretty print matches pretty_print
#[track_caller]
pub fn assert_prog_has_pretty_print(prog: &ast::Program, pretty_print: &str) {
  assert_eq!(pretty_print::pretty_print(prog).trim(), pretty_print.trim());
}
