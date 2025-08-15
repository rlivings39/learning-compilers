//! Interfaces to the system C compiler
//!
//! The system C compiler is used for preprocessing and final assembly

use crate::error::Error;
use std::ffi::OsStr;
use std::process::Command;

fn run_cc<I, S>(args: I, cc_name: Option<&str>) -> Result<std::process::Output, Error>
where
  I: IntoIterator<Item = S>,
  S: AsRef<OsStr>,
{
  let cc_name = cc_name.unwrap_or("gcc");
  let res = Command::new(cc_name).args(args).output();
  let res = match res {
    Err(e) => return Err(format!("Error launching {cc_name}: {e}")),
    Ok(r) => r,
  };
  if !res.status.success() {
    let stderr = String::from_utf8_lossy(&res.stderr);
    return Err(stderr.into_owned());
  }
  Ok(res)
}
pub fn preprocess_file(file_name: &str, output_file_name: &str) -> Result<(), Error> {
  run_cc(["-E", "-P", file_name, "-o", output_file_name], None)?;
  Ok(())
}

#[allow(dead_code)]
pub fn assemble_output(asm_file: &str, output_exe: &str) -> Result<(), Error> {
  run_cc([asm_file, "-o", output_exe], None)?;
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn fail_run_cc() {
    let args: [&str; 0] = [];
    assert!(run_cc(args, Some("bogus_cc_name")).is_err())
  }

  #[test]
  fn preprocess_negative() {
    assert!(preprocess_file("bogus_input_file.c", "bogus_input_file.i").is_err());
  }

  #[test]
  fn assemble_negative() {
    assert!(assemble_output("bogus_input_file.c", "bogus_input_file.i").is_err());
  }

  // TODO add some positive tests. Look at the tempfile crate
}
