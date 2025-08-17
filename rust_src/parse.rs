//! The parser for notcc

use crate::error::Error;
use crate::lex::{Token, TokenData, TokenKind};
use crate::source_files::SourceFile;
use crate::{ast, shared_types::Identifier};

// TODO report error locations
struct Parser<'a> {
  tokens: std::slice::Iter<'a, Token>,
  file: &'a SourceFile,
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

impl Parser<'_> {
  fn expect_one_of(&mut self, kinds: &[TokenKind]) -> Result<&Token, Error> {
    let token = match self.tokens.next() {
      Some(t) => t,
      None => return Err(format!("Unexpected end of file. Expected {kinds:?}")),
    };
    if !kinds.contains(&token.kind) {
      return Err(self.file.err_in_range(
        token.text_start,
        token.text_end,
        &format!("Expected {kinds:?}. Found {:?}", token.kind),
      ));
    }

    Ok(token)
  }

  fn expect(&mut self, kind: TokenKind) -> Result<&Token, Error> {
    self.expect_one_of(&[kind])
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
    let mut left = self.parse_factor()?;
    let mut next_token = self.peek_token()?;
    while let Some(next_precedence) = binop_precedence(next_token)
      && next_precedence >= min_precedence
    {
      match next_token.kind {
        TokenKind::Assign => {
          self.take_token()?;
          // Don't increment precedence because assignment is right associative
          let right = self.parse_expr(next_precedence)?;
          left = ast::Expr::Assignment(Box::new(left), Box::new(right));
        }
        TokenKind::Question => {
          self.take_token()?;
          let true_expr = Box::new(self.parse_expr(0)?);
          self.expect(TokenKind::Colon)?;
          let false_expr = Box::new(self.parse_expr(next_precedence)?);
          left = ast::Expr::Conditional {
            cond: Box::new(left),
            true_expr,
            false_expr,
          };
        }
        _ => {
          // Operators are left-associative so that
          //   1 + 2 - 3
          // becomes
          //   (1+2) - 3
          let op = self.parse_binop()?;
          let right = self.parse_expr(next_precedence + 1)?;
          left = ast::Expr::BinaryExpr(op, Box::new(left), Box::new(right));
        }
      }
      next_token = self.peek_token()?;
    }
    Ok(left)
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
    self.expect(TokenKind::Semicolon)?;
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

  fn parse_factor(&mut self) -> Result<ast::Expr, Error> {
    let token = self.peek_token()?;
    match token.kind {
      TokenKind::LeftParen => {
        self.take_token()?;
        let expr = self.parse_expr(0)?;
        self.expect(TokenKind::RightParen)?;
        Ok(expr)
      }
      TokenKind::IntConstant => self.parse_int_constant(),
      TokenKind::Minus
      | TokenKind::UnaryBitwiseComplement
      | TokenKind::Decrement
      | TokenKind::LogicalNot => self.parse_unary_expr(),
      TokenKind::Identifier => {
        let name = self.parse_identifier()?;
        Ok(ast::Expr::Var(name))
      }
      // List out the rest so when we add a new token kind, the compiler reminds
      // us to deal with it somewhere in this file.
      TokenKind::RightParen
      | TokenKind::LeftCurly
      | TokenKind::RightCurly
      | TokenKind::LeftSquare
      | TokenKind::RightSquare
      | TokenKind::KwInt
      | TokenKind::KwVoid
      | TokenKind::KwReturn
      | TokenKind::Semicolon
      | TokenKind::Plus
      | TokenKind::Times
      | TokenKind::Divide
      | TokenKind::Remainder
      | TokenKind::And
      | TokenKind::Or
      | TokenKind::Less
      | TokenKind::LessEq
      | TokenKind::Greater
      | TokenKind::GreaterEq
      | TokenKind::Equal
      | TokenKind::NotEqual
      | TokenKind::Assign
      | TokenKind::KwIf
      | TokenKind::KwElse
      | TokenKind::Question
      | TokenKind::Colon
      | TokenKind::Bogus
      | TokenKind::Eof => Err(format!(
        "Failed to parse {:?}. Expected an expression.",
        token.kind
      )),
    }
  }

  fn parse_binop(&mut self) -> Result<ast::BinaryOp, Error> {
    let token = self.peek_token()?;
    let res = match token.kind {
      TokenKind::Plus => Ok(ast::BinaryOp::Plus),
      TokenKind::Minus => Ok(ast::BinaryOp::Subtract),
      TokenKind::Divide => Ok(ast::BinaryOp::Divide),
      TokenKind::Times => Ok(ast::BinaryOp::Multiply),
      TokenKind::Remainder => Ok(ast::BinaryOp::Remainder),
      TokenKind::And => Ok(ast::BinaryOp::And),
      TokenKind::Or => Ok(ast::BinaryOp::Or),
      TokenKind::Greater => Ok(ast::BinaryOp::Greater),
      TokenKind::GreaterEq => Ok(ast::BinaryOp::GreaterEqual),
      TokenKind::Less => Ok(ast::BinaryOp::Less),
      TokenKind::LessEq => Ok(ast::BinaryOp::LessEqual),
      TokenKind::Equal => Ok(ast::BinaryOp::Equal),
      TokenKind::NotEqual => Ok(ast::BinaryOp::NotEqual),
      _ => Err(format!("Expected binary operator. Found {:?}.", token.kind)),
    };
    self.take_token()?;
    res
  }

  fn parse_int_constant(&mut self) -> Result<ast::Expr, Error> {
    let token = self.expect(TokenKind::IntConstant)?;
    let val = match token.data {
      TokenData::Identifier(_) | TokenData::None => panic!("Expected integer"),
      TokenData::IntConstant(val) => val,
    };
    Ok(ast::Expr::IntConstant(val))
  }

  fn parse_unary_expr(&mut self) -> Result<ast::Expr, String> {
    let token = self.expect_one_of(&[
      TokenKind::Minus,
      TokenKind::UnaryBitwiseComplement,
      TokenKind::Decrement,
      TokenKind::LogicalNot,
    ])?;
    let op = match token.kind {
      TokenKind::Minus => Ok(ast::UnaryOperator::Minus),
      TokenKind::UnaryBitwiseComplement => Ok(ast::UnaryOperator::Complement),
      TokenKind::LogicalNot => Ok(ast::UnaryOperator::LogicalNot),
      TokenKind::Decrement => Err("-- is not supported".to_string()),
      _ => Err("Unreachable".to_string()),
    }?;
    let expr = self.parse_factor()?;
    Ok(ast::Expr::UnaryExpr(op, Box::new(expr)))
  }
}

pub fn parse(tokens: &[Token], source: &SourceFile) -> Result<ast::Program, Error> {
  let mut parser = Parser {
    tokens: tokens.iter(),
    file: source,
  };
  let func = parser.parse_function()?;
  // Ensure we're at the end of the file
  parser.expect(TokenKind::Eof)?;
  Ok(ast::Program { function: func })
}

#[cfg(test)]
mod tests {
  use crate::{lex, pretty_print, source_files::SourceFile};

  use super::*;
  #[allow(unused_imports)]
  use pretty_assertions::{assert_eq, assert_ne, assert_str_eq};
  #[test]
  fn end_of_file() {
    // First check if token iterator is finished
    let tokens: [Token; 0] = [];
    let mut parser = Parser {
      tokens: tokens.iter(),
      file: &SourceFile::new(String::new(), String::new()),
    };
    let res = parser.expect(TokenKind::And);
    assert!(res.is_err());
    let err = res.unwrap_err();
    assert!(err.contains("And") && err.contains("end of file"));
  }

  fn run_parser(code: &str) -> Result<ast::Program, Error> {
    let source = SourceFile::new(code.to_string(), "bogus.c".to_string());
    let tokens = lex::lex(&source)?;
    parse(&tokens, &source)
  }

  #[test]
  // A basic smoke test until I get the pretty printer working
  fn parse_smoke_test() -> Result<(), Box<dyn std::error::Error>> {
    let prog = run_parser(
      r#"
int main (void) {
  return 2;
}
    "#
      .trim(),
    )?;
    assert_eq!(prog.function.name, "main");

    // Ensure we error for junk at the end
    let err = run_parser("int main (void) { return 3; } )").unwrap_err();
    assert!(err.contains("Eof"));

    run_parser("int main (void) { int x x = 2; return 3; }").unwrap_err();
    Ok(())
  }

  #[track_caller]
  fn assert_has_pretty_print(code: &str, pretty_print: &str) {
    let prog = match run_parser(code.trim()) {
      Ok(prog) => prog,
      // Panic here because it gives better error locations and diagnostics
      Err(e) => panic!("{e}"),
    };
    assert_eq!(
      pretty_print::pretty_print(&prog).trim(),
      pretty_print.trim()
    );
  }

  #[track_caller]
  fn assert_errors<F, T>(f: F, msg: Option<&str>)
  where
    F: Fn() -> Result<T, Error>,
    T: std::fmt::Debug,
  {
    let msg = msg.unwrap_or("Expected an error");
    f().expect_err(msg);
  }

  #[test]
  fn basic_main() {
    let main = r#"
  int main (void) {
    return 2;
  }"#;
    let expected = r#"
Program(
  Function main() {
    return $2;
  }
)"#;
    assert_has_pretty_print(main, expected);
  }

  #[test]
  fn parse_uminus() {
    let main = r#"
  int main (void) {
    return -2;
  }"#;
    let expected = r#"
Program(
  Function main() {
    return Minus($2);
  }
)"#;
    assert_has_pretty_print(main, expected);

    let main = r#"
int main (void) {
  return -(-2);
}
"#;
    let expected = r#"
Program(
  Function main() {
    return Minus(Minus($2));
  }
)
"#;
    assert_has_pretty_print(main, expected)
  }

  #[test]
  fn decrement_neg() {
    let err = run_parser(
      r#"
int main (void) {
  return --2;
}
    "#,
    )
    .unwrap_err();
    assert!(err.contains("not supported"));
  }

  #[test]
  fn binop_parsing() {
    let all_ops_prog = "int main(void) { return 1 - 3 * 4 + 5 % 6;}";
    let expected = r#"
Program(
  Function main() {
    return Plus(Subtract($1, Multiply($3, $4)), Remainder($5, $6));
  }
)"#;
    assert_has_pretty_print(all_ops_prog, expected);

    let paren_ops_prog = "int main(void) { return (1 - 3) * 4 + 5 % 6;}";
    let expected = r#"
Program(
  Function main() {
    return Plus(Multiply(Subtract($1, $3), $4), Remainder($5, $6));
  }
)"#;
    assert_has_pretty_print(paren_ops_prog, expected);
  }

  #[test]
  fn logical_ops() {
    let logical_ops_prog = "int main(void) { return 1 && 2 || 3 < 4 <= 5 > 6 >= 7 == 8 != 9;}";
    let expected = r#"
Program(
  Function main() {
    return Or(And($1, $2), NotEqual(Equal(GreaterEqual(Greater(LessEqual(Less($3, $4), $5), $6), $7), $8), $9));
  }
)"#;
    assert_has_pretty_print(logical_ops_prog, expected);
  }

  #[test]
  fn assignments() {
    let main = r#"
    int main(void) {
      ;
      int x = 1;
      int y;
      int z;
      y = 2;
      z = y + (x=y=3);
      return y + x + z;
    }"#;
    let expected = r#"
Program(
  Function main() {
    ;
    Declaration(x, $1);
    Declaration(y);
    Declaration(z);
    =($y, $2);
    =($z, Plus($y, =($x, =($y, $3))));
    return Plus(Plus($y, $x), $z);
  }
)"#;
    assert_has_pretty_print(main, expected);
  }

  #[test]
  fn if_no_else() {
    let main = r#"
    int main(void) {
      if (0)
        return 0;
    }"#;
    let expected = r#"
Program(
  Function main() {
    If($0) {
      return $0;
    }
  }
)"#;
    assert_has_pretty_print(main, expected);
  }

  #[test]
  fn if_else() {
    let main = r#"
    int main(void) {
      if (0)
        return 0;
      else
        return 1;
    }"#;
    let expected = r#"
Program(
  Function main() {
    If($0) {
      return $0;
    } Else {
      return $1;
    }
  }
)"#;
    assert_has_pretty_print(main, expected);
  }

  #[test]
  fn if_else_if() {
    assert_has_pretty_print(
      r#"
    int main(void) {
      if (0)
        return 0;
      else if(2)
        return 1;
    }
    "#,
      r#"
Program(
  Function main() {
    If($0) {
      return $0;
    } Else {
      If($2) {
        return $1;
      }
    }
  }
)
  "#,
    );
  }

  #[test]
  fn if_else_if_else() {
    assert_has_pretty_print(
      r#"
    int main(void) {
      if (0)
        return 0;
      else if(2)
        return 1;
      else
        return 2;
    }
    "#,
      r#"
Program(
  Function main() {
    If($0) {
      return $0;
    } Else {
      If($2) {
        return $1;
      } Else {
        return $2;
      }
    }
  }
)
      "#,
    );
  }

  #[test]
  fn conditional_expr() {
    assert_has_pretty_print(
      r#"
      int main(void) {
        int a = 7;
        int x;
        x = 0 ? 1 + 2 : 3*a;
        return x;
      }
    "#,
      r#"
Program(
  Function main() {
    Declaration(a, $7);
    Declaration(x);
    =($x, Conditional($0, Plus($1, $2), Multiply($3, $a)));
    return $x;
  }
)
      "#,
    );

    assert_errors(|| run_parser("int main(void) { return 0 ? :;} "), None);
    assert_errors(|| run_parser("int main(void) { 0 ? 1: ;"), None)
  }
}
