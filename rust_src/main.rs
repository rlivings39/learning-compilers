//mod driver;
use notcc;
use std::env;
fn main() -> Result<(), notcc::error::Error> {
  // TODO why mut?
  notcc::driver_main(&mut env::args())
}
