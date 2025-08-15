//! The parser for notcc

use crate::error::Error;
use crate::lex::{Token, TokenKind};
use crate::{ast, shared_types::Identifier};

struct Parser<'a> {
  tokens: std::slice::Iter<'a, Token>,
}

impl Parser<'_> {
  fn parse_function(&self) -> Result<ast::Function, Error> {
    Ok(ast::Function {
      body: Vec::new(),
      name: Identifier::new(""),
    })
  }

  fn expect(&mut self, kind: TokenKind) -> Result<(), Error> {
    let token = match self.tokens.next() {
      Some(t) => t,
      None => return Err(format!("Unexpected end of file. Expected {kind:?}")),
    };
    Ok(())
  }
}
pub fn parse(tokens: &[Token]) -> Result<ast::Program, Error> {
  let parser = Parser {
    tokens: tokens.iter(),
  };
  let func = parser.parse_function()?;
  Ok(ast::Program { function: func })
}

#[cfg(test)]
mod tests {
  use super::*;
  #[allow(unused_imports)]
  use pretty_assertions::{assert_eq, assert_ne, assert_str_eq};
  #[test]
  fn end_of_file() {
    let tokens: [Token; 0] = [];
    let mut parser = Parser {
      tokens: tokens.iter(),
    };
    let res = parser.expect(TokenKind::And);
    assert!(res.is_err());
    let err = res.unwrap_err();
    assert!(err.contains("And") && err.contains("end of file"));
  }
}
