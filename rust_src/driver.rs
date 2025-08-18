//! Main driver code for notcc
use crate::error::Error;
use crate::source_files::SourceFile;
use crate::{lex, parse, pretty_print, semantics};
pub mod arg_parser;
mod system_cc;

/// notcc main driver function taking already parsed args.
///
/// Use this for lib usage
pub fn driver_main(args: &arg_parser::Cli) -> Result<(), Error> {
  let file_name = &args.input_file;
  let output_file_name = file_name.replace(".c", ".i");
  system_cc::preprocess_file(file_name, &output_file_name)?;
  let code = match std::fs::read_to_string(&output_file_name) {
    Ok(s) => s,
    Err(e) => {
      return Err(format!(
        "Failed to read preprocessed file {output_file_name}\n\n{e}"
      ));
    }
  };
  let source_file = SourceFile::new(code, file_name.clone());
  let tokens = lex::lex(&source_file)?;
  if args.print_tokens {
    println!("Tokens from {}\n\n{:#?}", source_file.path, tokens);
  }
  if args.lex {
    return Ok(());
  }

  let mut prog = parse::parse(&tokens, &source_file)?;
  if args.pretty_print {
    print!("{}", pretty_print::pretty_print(&prog));
  }
  if args.parse {
    return Ok(());
  }
  semantics::run_semantic_analysis(&mut prog)?;
  Ok(())
}

/// notcc main driver function taking CLI args and parsing them
///
/// **Note**: Unless you're writing a CLI application, you should use `driver_main` instead
pub fn driver_main_cli(args: impl Iterator<Item = String>) -> Result<(), Error> {
  let args: arg_parser::ArgVec = args.collect();
  let cli = arg_parser::parse_arguments(args)?;
  driver_main(&cli)
}
