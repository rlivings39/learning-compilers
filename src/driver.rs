//! Main driver code for notcc
use crate::emit_asm::emit_asm;
use crate::error::Error;
use crate::pretty_print_tacky::pretty_print_tacky;
use crate::source_files::SourceFile;
use crate::{ast_to_tacky, lex, parse, pretty_print, semantics, tacky_to_asm};
pub mod arg_parser;
mod system_cc;

/// Return a new file name with the extension changed
fn replace_extension(file_name: &str, ext: &str) -> String {
  let mut path = std::path::PathBuf::from(file_name);
  path.set_extension(ext);
  path.to_string_lossy().to_string()
}

/// notcc main driver function taking already parsed args.
///
/// Use this for lib usage
pub fn driver_main(args: &arg_parser::Cli) -> Result<(), Error> {
  let file_name = &args.input_file;
  let output_file_name = replace_extension(file_name, "i");
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
  if args.pretty_print_semantics {
    print!("{}", pretty_print::pretty_print(&prog));
  }
  if args.validate {
    return Ok(());
  }
  let tacky_prog = ast_to_tacky::ast_to_tacky(&prog);
  if args.pretty_print_tacky {
    print!("{}", pretty_print_tacky(&tacky_prog));
  }
  if args.tacky {
    return Ok(());
  }
  let asm = tacky_to_asm::tacky_to_asm(&tacky_prog);
  if args.codegen {
    return Ok(());
  }

  let asm_code = emit_asm(&asm);
  let asm_file_name = replace_extension(file_name, "s");
  match std::fs::write(asm_file_name.clone(), asm_code) {
    Err(e) => Err(format!(
      "Failed to write ASM file {asm_file_name}. Error:\n\n{e}"
    )),
    Ok(..) => Ok(()),
  }?;
  if args.asm_only {
    return Ok(());
  }
  let exe_file = replace_extension(file_name, "");
  system_cc::assemble_file(&asm_file_name, &exe_file)?;
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
