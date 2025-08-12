//mod driver;
use notcc;

fn main() -> Result<(), notcc::error::Error> {
  notcc::driver();
  return notcc::error::fail("Bad news bro!");
}
