//! The notcc lexer

use crate::error::Error;
use crate::source_files::{Location, SourceFile};
use regex::Regex;

/// Token is the core token type returned by the lexer
///
/// Each token has its source location. Some token types also have auxiliary data.
#[derive(Copy, Clone, Debug)]
pub enum TokenKind {
  KwInt,
  KwVoid,
  KwReturn,
  KwIf,
  KwElse,
  LeftParen,
  RightParen,
  LeftCurly,
  RightCurly,
  LeftSquare,
  RightSquare,
  Semicolon,
  Identifier,
  IntConstant,
  UnaryBitwiseComplement,
  LogicalNot,
  Decrement,
  Minus,
  Plus,
  Times,
  Divide,
  Remainder,
  And,
  Or,
  Less,
  LessEq,
  Greater,
  GreaterEq,
  Equal,
  NotEqual,
  Assign,
  Question,
  Colon,
  Eof,
  Bogus,
}
#[derive(Debug)]
pub enum TokenData {
  Identifier(String),
  IntConstant(i32),
  None,
}
#[derive(Debug)]
pub struct Token {
  kind: TokenKind,
  text_start: usize,
  text_end: usize,
  data: TokenData,
}

const PATTERN_MAP: [(&'static str, TokenKind); 33] = [
  ("^int\\b", TokenKind::KwInt),
  ("^void\\b", TokenKind::KwVoid),
  ("^return\\b", TokenKind::KwReturn),
  ("^if\\b", TokenKind::KwIf),
  ("^else\\b", TokenKind::KwElse),
  ("^\\(", TokenKind::LeftParen),
  ("^\\)", TokenKind::RightParen),
  ("^\\{", TokenKind::LeftCurly),
  ("^\\}", TokenKind::RightCurly),
  ("^\\[", TokenKind::LeftSquare),
  ("^\\]", TokenKind::RightSquare),
  ("^;", TokenKind::Semicolon),
  ("^[a-zA-z_]\\w*\\b", TokenKind::Identifier),
  ("^[0-9]+\\b", TokenKind::IntConstant),
  ("^~", TokenKind::UnaryBitwiseComplement),
  ("^!", TokenKind::LogicalNot),
  ("^--", TokenKind::Decrement),
  ("^\\-", TokenKind::Minus),
  ("^\\+", TokenKind::Plus),
  ("^\\*", TokenKind::Times),
  ("^/", TokenKind::Divide),
  ("^%", TokenKind::Remainder),
  ("^&&", TokenKind::And),
  ("^\\|\\|", TokenKind::Or),
  ("^<", TokenKind::Less),
  ("^<=", TokenKind::LessEq),
  ("^>", TokenKind::Greater),
  ("^>=", TokenKind::GreaterEq),
  ("^==", TokenKind::Equal),
  ("^!=", TokenKind::NotEqual),
  ("^=", TokenKind::Assign),
  ("^\\?", TokenKind::Question),
  ("^:", TokenKind::Colon),
];
pub fn lex(file: &SourceFile) -> Result<Vec<Token>, Error> {
  let re_map = PATTERN_MAP.map(|(str, kind)| (Regex::new(str).unwrap(), kind));

  let mut tokens: Vec<Token> = Vec::new();
  let orig_code: &str = file.code();
  let mut idx: usize = 0;
  while idx < orig_code.len() {
    let code = &orig_code[idx..];
    if code.chars().next().unwrap().is_ascii_whitespace() {
      idx += 1;
      continue;
    }
    let mut match_kind = TokenKind::Bogus;
    let mut match_str: &str = "";
    for (pattern, kind) in &re_map {
      let m = pattern.find(code);
      if let Some(this_match) = m
        && this_match.len() > match_str.len()
      {
        match_str = this_match.as_str();
        match_kind = *kind;
      }
    }
    if let TokenKind::Bogus = match_kind {
      return Err(file.err_at_index(idx, "Failed to lex"));
    }
    let data = match match_kind {
      TokenKind::Identifier => TokenData::Identifier(match_str.to_string()),
      TokenKind::IntConstant => TokenData::IntConstant(match_str.parse::<i32>().unwrap()),
      _ => TokenData::None,
    };
    tokens.push(Token {
      kind: match_kind,
      text_start: idx,
      text_end: idx + match_str.len(),
      data,
    });
    idx += match_str.len();
  }
  tokens.push(Token {
    kind: TokenKind::Eof,
    text_start: idx,
    text_end: idx,
    data: TokenData::None,
  });
  Ok(tokens)
}
