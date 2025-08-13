//! The notcc lexer

use crate::error::Error;
use crate::source_files::{Location, SourceFile};

/// Token is the core token type returned by the lexer
///
/// Each token has its source location. Some token types also have auxiliary data.
pub enum Token {
  KwInt(Location),
  KwVoid(Location),
  KwReturn(Location),
  KwIf(Location),
  KwElse(Location),
  LeftParen(Location),
  RightParen(Location),
  LeftCurly(Location),
  RightCurly(Location),
  LeftSquare(Location),
  RightSquare(Location),
  Semicolon(Location),
  Identifier(Location, String),
  IntConstant(Location, i32),
  UnaryBitwiseComplement(Location),
  LogicalNot(Location),
  Decrement(Location),
  Minus(Location),
  Plus(Location),
  Times(Location),
  Divide(Location),
  Remainder(Location),
  And(Location),
  Or(Location),
  Less(Location),
  LessEq(Location),
  Greater(Location),
  GreaterEq(Location),
  Equal(Location),
  NotEqual(Location),
  Assign(Location),
  Question(Location),
  Colon(Location),
}

pub fn lex(file: &SourceFile) -> Result<Vec<Token>, Error> {
  let tokens: Vec<Token> = Vec::new();
  let code = file.code();
  for (_, _) in code.chars().enumerate() {}
  Ok(tokens)
}
