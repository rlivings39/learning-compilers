//! Interfaces to the system C compiler
//!
//! The system C compiler is used for preprocessing and final assembly

use crate::error::Error;

pub fn preprocess_file(file_name: &str, output_file_name: &str) -> Result<(), Error> {
  Ok(())
}

pub fn assemble_output(asm_file: &str, output_exe: &str) -> Result<(), Error> {
  Ok(())
}
