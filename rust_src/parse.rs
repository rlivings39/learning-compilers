//! The parser for notcc

use crate::error::Error;
use crate::lex::{Token, TokenData, TokenKind};
use crate::{ast, shared_types::Identifier};

struct Parser<'a> {
  tokens: std::slice::Iter<'a, Token>,
}

fn check_token_exists(token: Option<&Token>) -> Result<&Token, Error> {
  match token {
    Some(t) => Ok(t),
    None => Err("Unexpected end of file.".to_string()),
  }
}

fn binop_precedence(token: &Token) -> Option<i32> {
  match token.kind {
    TokenKind::Assign => Some(1),
    TokenKind::Question => Some(2),
    TokenKind::Or => Some(5),
    TokenKind::And => Some(10),
    TokenKind::Equal => Some(30),
    TokenKind::NotEqual => Some(30),
    TokenKind::Less => Some(35),
    TokenKind::LessEq => Some(35),
    TokenKind::Greater => Some(35),
    TokenKind::GreaterEq => Some(35),
    TokenKind::Plus => Some(45),
    TokenKind::Minus => Some(45),
    TokenKind::Divide => Some(50),
    TokenKind::Times => Some(50),
    TokenKind::Remainder => Some(50),
    _ => None,
  }
}

fn is_binop(token: &Token) -> bool {
  binop_precedence(token).is_some()
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
    check_token_exists(self.tokens.next()).map(|_| ())
  }

  fn peek_token(&self) -> Result<&Token, Error> {
    let mut iter = self.tokens.clone();
    let token = iter.next();
    check_token_exists(token)
  }

  fn parse_block_item(&mut self) -> Result<ast::BlockItem, Error> {
    let next_token = self.peek_token()?;
    match next_token.kind {
      TokenKind::KwInt => self.parse_declaration(),
      _ => self.parse_stmt().map(|stmt| ast::BlockItem::Stmt(stmt)),
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

  // TODO check all parse_expr calls to make sure I have the right starting precedence
  fn parse_expr(&mut self, min_precedence: i32) -> Result<ast::Expr, Error> {
    let left = self.parse_factor()?;
    let next_token = self.peek_token()?.clone();
    let next_precedence = binop_precedence(next_token);
    while let Some(next_precedence) = next_precedence
      && next_precedence >= min_precedence
    {
      // match next_token.kind {
      //   // TokenKind::Assign => {
      //   //   self.take_token()?;
      //   // }
      //   // TokenKind::Question => {}
      //   // _ => {}
      // }
    }
    Err("".to_string())
  }

  fn parse_declaration(&mut self) -> Result<ast::BlockItem, Error> {
    self.expect(TokenKind::KwInt)?;
    let name = self.parse_identifier()?;
    let next_token = self.peek_token()?;
    let init = match next_token.kind {
      TokenKind::Assign => {
        self.take_token()?;
        Some(self.parse_expr(0)?)
      }
      _ => None,
    };
    Ok(ast::BlockItem::Declaration(name, init))
  }

  fn parse_stmt(&mut self) -> Result<ast::Stmt, Error> {
    let next_token = self.peek_token()?;
    match next_token.kind {
      TokenKind::KwReturn => {
        self.take_token()?;
        let expr = self.parse_expr(0)?;
        self.expect(TokenKind::Semicolon)?;
        Ok(ast::Stmt::Return(expr))
      }
      TokenKind::Semicolon => {
        self.take_token()?;
        Ok(ast::Stmt::Null)
      }
      TokenKind::KwIf => {
        self.take_token()?;
        self.expect(TokenKind::LeftParen)?;
        let cond = self.parse_expr(0)?;
        self.expect(TokenKind::RightParen)?;
        let true_stmt = self.parse_stmt()?;
        let mut false_stmt: Option<ast::Stmt> = None;
        // TODO need to check for existence? I think there must be another token after an if
        let next_token = self.peek_token()?;
        if let TokenKind::KwElse = next_token.kind {
          self.take_token()?;
          false_stmt = Some(self.parse_stmt()?);
        }
        Ok(ast::Stmt::If {
          cond: cond,
          true_stmt: Box::new(true_stmt),
          false_stmt: false_stmt.map(|s| Box::new(s)),
        })
      }
      _ => {
        let stmt = ast::Stmt::Expr(self.parse_expr(1)?);
        self.expect(TokenKind::Semicolon)?;
        Ok(stmt)
      }
    }
  }

  fn parse_factor(&self) -> Result<ast::Expr, Error> {
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
