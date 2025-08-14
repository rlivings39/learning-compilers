//! Simple shared types used in notcc

#[derive(Clone, PartialEq, Debug)]
/// Our identifier type. Isolated here to make it easier to change
/// to interned in the future.
pub struct Identifier {
  val: String,
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
