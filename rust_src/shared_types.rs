//! Simple shared types used in notcc
use std::fmt;
use std::fmt::Display;
#[derive(Clone, PartialEq, Debug)]
/// Our identifier type. Isolated here to make it easier to change
/// to interned in the future.
pub struct Identifier {
  val: String,
}

impl Display for Identifier {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    // Write strictly the first element into the supplied output
    // stream: `f`. Returns `fmt::Result` which indicates whether the
    // operation succeeded or failed. Note that `write!` uses syntax which
    // is very similar to `println!`.
    write!(f, "{}", self.val)
  }
}

impl Identifier {
  pub fn new(name: &str) -> Identifier {
    Identifier {
      val: name.to_string(),
    }
  }
}

impl std::cmp::PartialEq<&str> for Identifier {
  fn eq(&self, other: &&str) -> bool {
    self.val == *other
  }
}

#[cfg(test)]

mod tests {
  use super::*;
  use pretty_assertions::assert_eq;
  #[test]
  fn identifier_disp() {
    let id = Identifier::new("value");
    assert_eq!(format!("{id}"), "value");
  }
}
