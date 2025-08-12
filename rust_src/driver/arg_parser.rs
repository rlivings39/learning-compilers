//! CLI argument parsing for notcc
use crate::error::Error;
use clap::Parser;

#[derive(Parser, Debug)]
#[command(version, about = "Compiles /path/to/input-file.c creating an executable /path/to/input-file using the system gcc", long_about = None)] // Read from `Cargo.toml`
/// CLI arg struct for notcc
pub struct Cli {
  // TODO can these not be public?
  /// Input C source file
  #[arg(name = "C_FILE")]
  pub input_file: String,
  /// Run the lexer but stop before parsing
  #[arg(long, default_value_t = false)]
  pub lex: bool,
  /// Print out the tokens found by the lexer
  #[arg(long = "print-tokens", default_value_t = false)]
  pub print_tokens: bool,
  /// Run the lexer and parser but stop before codegen
  #[arg(long, default_value_t = false)]
  pub parse: bool,
  /// Pretty print the output of the parser
  #[arg(long = "pretty-print", default_value_t = false)]
  pub pretty_print: bool,
  /// Run up to the parser and semantic analysis
  #[arg(long, default_value_t = false)]
  pub validate: bool,
  /// Run the lexer, parser, and TACKY IR generation stopping before assembly generation
  #[arg(long, default_value_t = false)]
  pub tacky: bool,
  /// Pretty print TACKY IR after generation
  #[arg(long = "pretty-print-tacky", default_value_t = false)]
  pub pretty_print_tacky: bool,
  /// Run the lexer, parser, codegen but stop before assembly generation
  #[arg(long, default_value_t = false)]
  pub codegen: bool,
  /// Emit assembly in input-file.s rather than linking an executable
  #[arg(long = "asm-only", short = 'S', default_value_t = false)]
  pub asm_only: bool,
}

pub type ArgVec = Vec<String>;
/// Parse the CLI arguments passed to notcc and return a Cli or error as appropriate
/// For clap errors, `process::exit` is called directly
pub fn parse_arguments(args: ArgVec) -> Result<Cli, Error> {
  let cli = Cli::parse_from(args);
  if cli.lex as i32 + cli.codegen as i32 + cli.tacky as i32 + cli.asm_only as i32 > 1 {
    return Err("At most 1 of --lex, --codegen, --tacky, --asm-only may be passed".to_string());
  } else {
    return Ok(cli);
  }
}

#[cfg(test)]
mod tests {
  use super::parse_arguments;

  #[test]
  fn arg_parser() {
    let cli = parse_arguments(vec!["".to_string(), "file".to_string()]).unwrap();
    assert_eq!(cli.input_file, "file");
  }
  #[test]
  fn arg_parser_neg() {
    assert!(
      parse_arguments(vec![
        "".to_string(),
        "file".to_string(),
        "--lex".to_string(),
        "--codegen".to_string()
      ])
      .is_err()
    );
  }
  // TODO can I test clap errors properly? Should I?
}
