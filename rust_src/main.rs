mod error;
//mod driver;

fn main() -> Result<(), error::Error> {
  return error::fail("Bad news bro!");
}
