//! The parser for notcc

use crate::error::Error;
use crate::lex::{Token, TokenData, TokenKind};
use crate::{ast, shared_types::Identifier};

struct Parser<'a> {
  tokens: std::slice::Iter<'a, Token>,
}

impl Parser<'_> {
  fn expect(&mut self, kind: TokenKind) -> Result<&Token, Error> {
    let token = match self.tokens.next() {
      Some(t) => t,
      None => return Err(format!("Unexpected end of file. Expected {kind:?}")),
    };
    if token.kind != kind {
      return Err(format!("Expected {kind:?}. Found {:?}", token.kind));
    }

    Ok(token)
  }

  fn take_token(&mut self) -> Result<(), Error> {
    match self.tokens.next() {
      Some(_) => Ok(()),
      None => Err("Unexpected end of file.".to_string()), // TODO combine these messages
    }
  }

  fn peek_token(&mut self) -> Result<&Token, Error> {
    let mut iter = self.tokens.clone();
    let token = iter.next();
    match token {
      Some(t) => Ok(t),
      None => Err("Unexpected end of file.".to_string()),
    }
  }

  fn parse_block_item(&mut self) -> Result<ast::BlockItem, Error> {
    let next_token = self.peek_token()?;
    match next_token.kind {
      TokenKind::KwInt => self.parse_declaration(),
      _ => self.parse_stmt(),
    }
  }

  fn parse_function(&mut self) -> Result<ast::Function, Error> {
    self.expect(TokenKind::KwInt)?;
    let id = self.parse_identifier()?;
    self.expect(TokenKind::LeftParen)?;
    self.expect(TokenKind::KwVoid)?;
    self.expect(TokenKind::RightParen)?;
    self.expect(TokenKind::LeftCurly)?;
    let mut next_token = self.peek_token()?;
    let mut body: Vec<ast::BlockItem> = Vec::new();
    while next_token.kind != TokenKind::RightCurly {
      body.push(self.parse_block_item()?);
      next_token = self.peek_token()?;
    }
    self.expect(TokenKind::RightCurly)?;
    Ok(ast::Function {
      body: body,
      name: id,
    })
  }

  fn parse_identifier(&mut self) -> Result<Identifier, Error> {
    let tok = self.expect(TokenKind::Identifier)?;
    // TODO shouldn't need this. The TokenData type should be tied to the TokenKind
    match &tok.data {
      TokenData::Identifier(id) => return Ok(id.clone()),
      _ => panic!("Expected Identifier data on an Identifier token"),
    }
  }

  fn parse_expr(&mut self) -> Result<ast::Expr, Error> {
    todo!()
  }

  fn parse_declaration(&mut self) -> Result<ast::BlockItem, Error> {
    self.expect(TokenKind::KwInt)?;
    let name = self.parse_identifier()?;
    let next_token = self.peek_token()?;
    let init = match next_token.kind {
      TokenKind::Assign => {
        self.take_token()?;
        Some(self.parse_expr()?)
      }
      _ => None,
    };
    Ok(ast::BlockItem::Declaration(name, init))
  }

  fn parse_stmt(&self) -> Result<ast::BlockItem, Error> {
    todo!()
  }
}

pub fn parse(tokens: &[Token]) -> Result<ast::Program, Error> {
  let mut parser = Parser {
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
    // First check if token iterator is finished
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
