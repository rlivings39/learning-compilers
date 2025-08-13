//! The notcc lexer

use crate::error::Error;
use crate::source_files::{Location, SourceFile};
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
#[derive(Debug, PartialEq)]
pub enum TokenData {
  Identifier(String),
  IntConstant(i32),
  None,
}
#[derive(Debug, PartialEq)]
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

#[cfg(test)]
mod tests {
  use super::*;
  fn make_source(code: &str) -> SourceFile {
    SourceFile::new(code.to_string(), "".to_string())
  }
  fn run_lexer(code: &str) -> Vec<Token> {
    let res = lex(&&SourceFile::new(code.to_string(), "bogus.c".to_string()));
    if let Err(e) = &res {
      eprintln!("{e}");
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
          data: TokenData::Identifier("x".to_string())
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
  // TODO more tests
  //   const mainProg = `
  //   int main  (  void  \n) {
  //     return \n\n2;
  //   }`;
  //   expect(lex(mainProg)).toEqual([
  //     { kind: TokenKind.KW_INT },
  //     { kind: TokenKind.IDENTIFIER, id: "main" },
  //     { kind: TokenKind.LEFT_PAREN },
  //     { kind: TokenKind.KW_VOID },
  //     { kind: TokenKind.RIGHT_PAREN },
  //     { kind: TokenKind.LEFT_CURLY },
  //     { kind: TokenKind.KW_RETURN },
  //     { kind: TokenKind.INT_CONSTANT, value: 2 },
  //     { kind: TokenKind.SEMICOLON },
  //     { kind: TokenKind.RIGHT_CURLY },
  //   ]);
  //   expect(lex("//comment\n(")).toEqual([{ kind: TokenKind.LEFT_PAREN }]);
  //   expect(lex("/*comment*/\n(")).toEqual([{ kind: TokenKind.LEFT_PAREN }]);
  //   expect(() => lex("12ab")).toThrow(NotccError);
  // });

  // test("Lex unary ops", () => {
  //   expect(lex("-")).toMatchObject([{ kind: TokenKind.MINUS }]);
  //   expect(lex("--")).toMatchObject([{ kind: TokenKind.DECREMENT }]);
  //   expect(lex("~~x")).toMatchObject([
  //     { kind: TokenKind.UNARY_BITWISE_COMPLEMENT },
  //     { kind: TokenKind.UNARY_BITWISE_COMPLEMENT },
  //     { kind: TokenKind.IDENTIFIER },
  //   ]);
  //   expect(lex("!")).toMatchObject([{ kind: TokenKind.LOGICAL_NOT }]);
  // });

  // test("Lex binary ops", () => {
  //   expect(lex("+   ")).toMatchObject([{ kind: TokenKind.PLUS }]);
  //   expect(lex("  * ")).toMatchObject([{ kind: TokenKind.TIMES }]);
  //   expect(lex("/  ")).toMatchObject([{ kind: TokenKind.DIVIDE }]);
  //   expect(lex("%")).toMatchObject([{ kind: TokenKind.REMAINDER }]);
  //   expect(lex("a+ 2  ")).toMatchObject([
  //     { kind: TokenKind.IDENTIFIER, id: "a" },
  //     { kind: TokenKind.PLUS },
  //     { kind: TokenKind.INT_CONSTANT },
  //   ]);
  //   expect(lex("&&")).toMatchObject([{ kind: TokenKind.AND }]);
  //   expect(lex("||")).toMatchObject([{ kind: TokenKind.OR }]);
  //   expect(lex("<")).toMatchObject([{ kind: TokenKind.LESS }]);
  //   expect(lex("<=")).toMatchObject([{ kind: TokenKind.LESS_EQ }]);
  //   expect(lex(">")).toMatchObject([{ kind: TokenKind.GREATER }]);
  //   expect(lex(">=")).toMatchObject([{ kind: TokenKind.GREATER_EQ }]);
  //   expect(lex("==")).toMatchObject([{ kind: TokenKind.EQUAL }]);
  //   expect(lex("!=")).toMatchObject([{ kind: TokenKind.NOT_EQUAL }]);
  // });

  // test("Lex assign", () => {
  //   expect(lex("  = ")).toMatchObject([{ kind: TokenKind.ASSIGN }]);
  //   expect(lex("int x  = 2;")).toMatchObject([
  //     { kind: TokenKind.KW_INT },
  //     { kind: TokenKind.IDENTIFIER },
  //     { kind: TokenKind.ASSIGN },
  //     { kind: TokenKind.INT_CONSTANT },
  //     { kind: TokenKind.SEMICOLON },
  //   ]);
  // });

  // test("Lex if and ternary", () => {
  //   expect(lex("if")).toMatchObject([{ kind: TokenKind.KW_IF }]);
  //   expect(lex("else")).toMatchObject([{ kind: TokenKind.KW_ELSE }]);
  //   expect(lex("? : ")).toMatchObject([
  //     { kind: TokenKind.QUESTION },
  //     { kind: TokenKind.COLON },
  //   ]);
  // });
}
