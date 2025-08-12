//! CLI main function for notcc
use notcc;
use std::env;
use std::process;
fn main() {
  let res = notcc::driver_main_cli(env::args());
  if let Err(s) = res {
    eprintln!("Error: {s}");
    process::exit(1);
  }
}
