//! Pretty printer for TACKY IR

use crate::tacky;
/// Pretty print a given tacky program to a String
pub fn pretty_print_tacky(prog: &tacky::Program) -> String {
  // TODO implement this to make it stable
  format!("{:#?}", prog)
}
