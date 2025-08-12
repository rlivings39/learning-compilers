//! CLI main function for notcc
use notcc;
use std::env;
fn main() -> Result<(), notcc::error::Error> {
  // TODO why mut?
  notcc::driver_main_cli(&mut env::args())
}
