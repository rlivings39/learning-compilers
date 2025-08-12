use crate::error::Error;
use clap::Parser;
use std::env;
#[derive(Parser, Debug)]
#[command(version, about = "Compiles /path/to/input-file.c creating an executable /path/to/input-file using the system gcc", long_about = None)] // Read from `Cargo.toml`
pub struct Cli {
  /// Input C source file
  #[arg(name = "C_FILE")]
  input_file: String,
  /// Run the lexer but stop before parsing
  #[arg(long, default_value_t = false)]
  lex: bool,
  /// Print out the tokens found by the lexer
  #[arg(long = "print-tokens", default_value_t = false)]
  print_tokens: bool,
  /// Run the lexer and parser but stop before codegen
  #[arg(long, default_value_t = false)]
  parse: bool,
  /// Pretty print the output of the parser
  #[arg(long = "pretty-print", default_value_t = false)]
  pretty_print: bool,
  /// Run up to the parser and semantic analysis
  #[arg(long, default_value_t = false)]
  validate: bool,
  /// Run the lexer, parser, and TACKY IR generation stopping before assembly generation
  #[arg(long, default_value_t = false)]
  tacky: bool,
  /// Pretty print TACKY IR after generation
  #[arg(long = "pretty-print-tacky", default_value_t = false)]
  pretty_print_tacky: bool,
  /// Run the lexer, parser, codegen but stop before assembly generation
  #[arg(long, default_value_t = false)]
  codegen: bool,
  /// Emit assembly in input-file.s rather than linking an executable
  #[arg(long = "asm-only", short = 'S', default_value_t = false)]
  asm_only: bool,
}

type ArgVec = Vec<String>;
fn parse_arguments(args: ArgVec) -> Cli {
  Cli::parse_from(args)
  // TODO exclusivity checking for --lex, --codegen, etc.
}

pub fn driver_main(args: &mut env::Args) -> Result<(), Error> {
  let args: ArgVec = args.collect();
  let cli = parse_arguments(args);
  dbg!(cli);
  Ok(())
}

#[cfg(test)]
mod tests {
  use crate::driver::parse_arguments;

  #[test]
  fn arg_parser() {
    // TODO test extra arg parsing logic
    let cli = parse_arguments(vec!["".to_string(), "file".to_string()]);
    assert_eq!(cli.input_file, "file");
  }
}
