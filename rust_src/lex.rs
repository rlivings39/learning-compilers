//! The notcc lexer

use crate::error::Error;
use crate::shared_types::Identifier;
use crate::source_files::SourceFile;
use regex::Regex;

/// Token is the core token type returned by the lexer
///
/// Each token has its source location. Some token types also have auxiliary data.
#[derive(Copy, Clone, Debug, PartialEq)]
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

#[derive(Debug, PartialEq, Clone)]
pub enum TokenData {
  Identifier(Identifier),
  IntConstant(i32),
  None,
}
#[derive(Debug, PartialEq)]
pub struct Token {
  pub kind: TokenKind,
  pub text_start: usize,
  pub text_end: usize,
  pub data: TokenData,
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
      TokenKind::Identifier => TokenData::Identifier(Identifier::new(match_str)),
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

#[cfg(test)]
mod tests {
  use super::*;
  #[allow(unused_imports)]
  use pretty_assertions::{assert_eq, assert_ne, assert_str_eq};

  fn run_lexer(code: &str) -> Vec<Token> {
    let res = lex(&&SourceFile::new(code.to_string(), "bogus.c".to_string()));
    if let Err(e) = &res {
      println!("{e}");
      assert!(false, "Lexer failed. Aborting test.")
    }
    let mut res = res.unwrap();
    // Drop the Eof token as it clutters tests
    res.pop();
    res
  }
  #[test]
  fn lex_basic_tokens() {
    assert_eq!(run_lexer("").len(), 0);
    assert_eq!(run_lexer("   ").len(), 0);
    assert_eq!(run_lexer(" \n\n  ").len(), 0);
    assert_eq!(
      run_lexer("( \n\n  "),
      vec![Token {
        kind: TokenKind::LeftParen,
        text_start: 0,
        text_end: 1,
        data: TokenData::None
      }]
    );
    assert_eq!(
      run_lexer("( )\n\n  "),
      vec![
        Token {
          kind: TokenKind::LeftParen,
          text_start: 0,
          text_end: 1,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::RightParen,
          text_start: 2,
          text_end: 3,
          data: TokenData::None
        }
      ]
    );
  }

  #[test]
  fn test_id_tokens() {
    assert_eq!(
      run_lexer("  int    x\n\n  ;"),
      vec![
        Token {
          kind: TokenKind::KwInt,
          text_start: 2,
          text_end: 5,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::Identifier,
          text_start: 9,
          text_end: 10,
          data: TokenData::Identifier(Identifier::new("x"))
        },
        Token {
          kind: TokenKind::Semicolon,
          text_start: 14,
          text_end: 15,
          data: TokenData::None
        },
      ]
    )
  }

  #[test]
  fn test_main_function() {
    let main_prog: &str = "int main  (  void  \n) {
      return \n\n2;
    }";
    assert_eq!(
      run_lexer(main_prog),
      vec![
        Token {
          kind: TokenKind::KwInt,
          text_start: 0,
          text_end: 3,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::Identifier,
          text_start: 4,
          text_end: 8,
          data: TokenData::Identifier(Identifier::new("main"))
        },
        Token {
          kind: TokenKind::LeftParen,
          text_start: 10,
          text_end: 11,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::KwVoid,
          text_start: 13,
          text_end: 17,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::RightParen,
          text_start: 20,
          text_end: 21,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::LeftCurly,
          text_start: 22,
          text_end: 23,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::KwReturn,
          text_start: 30,
          text_end: 36,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::IntConstant,
          text_start: 39,
          text_end: 40,
          data: TokenData::IntConstant(2)
        },
        Token {
          kind: TokenKind::Semicolon,
          text_start: 40,
          text_end: 41,
          data: TokenData::None
        },
        Token {
          kind: TokenKind::RightCurly,
          text_start: 46,
          text_end: 47,
          data: TokenData::None
        },
      ]
    )
  }

  #[test]
  fn all_tokens() {
    // Our code snippets. Use PATTERN_MAP.len() to ensure we have the right number of examples.
    let code: [(&str, TokenKind, TokenData); PATTERN_MAP.len()] = [
      (" int ", TokenKind::KwInt, TokenData::None),
      ("void  ", TokenKind::KwVoid, TokenData::None),
      ("\nreturn\t  ", TokenKind::KwReturn, TokenData::None),
      ("if", TokenKind::KwIf, TokenData::None),
      ("else", TokenKind::KwElse, TokenData::None),
      ("(", TokenKind::LeftParen, TokenData::None),
      (")", TokenKind::RightParen, TokenData::None),
      ("{", TokenKind::LeftCurly, TokenData::None),
      ("}", TokenKind::RightCurly, TokenData::None),
      ("[", TokenKind::LeftSquare, TokenData::None),
      ("]", TokenKind::RightSquare, TokenData::None),
      (";", TokenKind::Semicolon, TokenData::None),
      (
        "a_name",
        TokenKind::Identifier,
        TokenData::Identifier(Identifier::new("a_name")),
      ),
      ("123", TokenKind::IntConstant, TokenData::IntConstant(123)),
      ("~", TokenKind::UnaryBitwiseComplement, TokenData::None),
      ("!", TokenKind::LogicalNot, TokenData::None),
      ("--", TokenKind::Decrement, TokenData::None),
      ("-", TokenKind::Minus, TokenData::None),
      ("+", TokenKind::Plus, TokenData::None),
      ("*", TokenKind::Times, TokenData::None),
      ("/", TokenKind::Divide, TokenData::None),
      ("%", TokenKind::Remainder, TokenData::None),
      ("&&", TokenKind::And, TokenData::None),
      ("||", TokenKind::Or, TokenData::None),
      ("<", TokenKind::Less, TokenData::None),
      ("<=", TokenKind::LessEq, TokenData::None),
      ("> ", TokenKind::Greater, TokenData::None),
      (">=", TokenKind::GreaterEq, TokenData::None),
      ("==", TokenKind::Equal, TokenData::None),
      ("!=", TokenKind::NotEqual, TokenData::None),
      ("=", TokenKind::Assign, TokenData::None),
      ("?", TokenKind::Question, TokenData::None),
      (":", TokenKind::Colon, TokenData::None),
    ];
    for (snippet, kind, data) in code {
      let tokens = run_lexer(snippet);
      assert_eq!(tokens.len(), 1, "Incorrect lex for {snippet}");
      let token = &tokens[0];
      assert_eq!(
        (&token.kind, &token.data),
        (&kind, &data),
        "Incorrect lex for {snippet}"
      );
    }
  }

  #[test]
  fn lex_negative() {
    let source = SourceFile::new("\n int x; $ more".to_string(), "bogus.c".to_string());
    let res = lex(&source);
    assert!(res.is_err(), "Expected lex of {} to fail", source.code());
    let msg = res.unwrap_err();
    // Ensure the message has useful things
    let patt = format!("{}:2:9", source.path);
    assert!(msg.contains(&patt), "{patt} not found in {msg}");
    let code = source.code();
    assert!(msg.contains(code), "{code} not found in {msg}");
  }

  #[test]
  #[should_panic]
  fn test_tool_negative() {
    run_lexer("$");
  }
}
