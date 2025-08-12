//! Main driver code for notcc
use crate::error::Error;
use std::env;

pub mod arg_parser;

/// notcc main driver function taking already parsed args.
///
/// Use this for lib usage
pub fn driver_main(args: &arg_parser::Cli) -> Result<(), Error> {
  dbg!(args);
  Ok(())
}

/// notcc main driver function taking CLI args and parsing them
///
/// **Note**: Unless you're writing a CLI application, you should use `driver_main` instead
pub fn driver_main_cli(args: &mut env::Args) -> Result<(), Error> {
  let args: arg_parser::ArgVec = args.collect();
  let cli = arg_parser::parse_arguments(args)?;
  driver_main(&cli)
}
