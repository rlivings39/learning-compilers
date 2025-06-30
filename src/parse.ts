import * as ast from "./ast";

import { match } from "ts-pattern";

import { Token, TokenKind, UnaryToken, UnaryTokenKind } from "./lex";

function fail(msg: string): never {
  throw Error(msg);
}

function expect(expected: TokenKind, tokens: Token[]): Token {
  let token = tokens.shift();
  if (!token) {
    fail(`Unexpected end of file. Expected ${TokenKind[expected]}`);
  }
  if (token.kind !== expected) {
    fail(`Expected ${TokenKind[expected]}. Found ${TokenKind[token.kind]}`);
  }
  return token;
}

function parseNumericConst(tokens: Token[]): ast.NumericConstant {
  const tok = expect(TokenKind.INT_CONSTANT, tokens);
  // TODO shouldn't need this assertion
  assert(tok.kind === TokenKind.INT_CONSTANT);
  return ast.NumericConstant(tok.value);
}

function parseUnary(token: UnaryToken, tokens: Token[]): ast.UnaryExpr {
  const t = expect(token.kind, tokens);
  const expr = parseExpr(tokens);
  switch (token.kind) {
    case TokenKind.UNARY_MINUS: {
      return ast.UnaryMinus(expr);
    }
    case TokenKind.UNARY_BITWISE_COMPLEMENT: {
      return ast.Complement(expr);
    }
    case TokenKind.DECREMENT: {
      fail(`-- is not supported`);
      return ast.Complement(expr);
    }
    default:
      const _check: never = token.kind;
      return _check;
  }
}

function parseExpr(tokens: Token[]): ast.Expr {
  const token = tokens[0];
  switch (token.kind) {
    case TokenKind.LEFT_PAREN: {
      expect(TokenKind.LEFT_PAREN, tokens);
      const expr = parseExpr(tokens);
      expect(TokenKind.RIGHT_PAREN, tokens);
      return expr;
    }
    case TokenKind.INT_CONSTANT: {
      return parseNumericConst(tokens);
    }
    case TokenKind.UNARY_MINUS:
    case TokenKind.UNARY_BITWISE_COMPLEMENT:
    case TokenKind.DECREMENT: {
      return parseUnary(token, tokens);
    }
    default: {
      fail(`Failed to parse ${TokenKind[token.kind]}. Expected an expression.`);
    }
  }
  // return match(tokens[0])
  //   .with(
  //     { kind: TokenKind.UNARY_MINUS },
  //     { kind: TokenKind.UNARY_BITWISE_COMPLEMENT },
  //     { kind: TokenKind.DECREMENT },
  //     (token) => {
  //       return parseUnary(token, tokens);
  //     }
  //   )
  //   .with({ kind: TokenKind.INT_CONSTANT }, () => {
  //     return parseNumericConst(tokens);
  //   })
  //   .with({ kind: TokenKind.LEFT_PAREN }, () => {
  //     expect(TokenKind.LEFT_PAREN, tokens);
  //     const expr = parseExpr(tokens);
  //     expect(TokenKind.RIGHT_PAREN, tokens);
  //     return expr;
  //   })
  //   .otherwise((token) =>
  //     fail(`Failed to parse ${TokenKind[token.kind]}. Expected an expression.`)
  //   );
}

function parseStatement(tokens: Token[]): ast.Stmt {
  expect(TokenKind.KW_RETURN, tokens);
  const expr = parseExpr(tokens);
  expect(TokenKind.SEMICOLON, tokens);
  return ast.ReturnStmt(expr);
}

function assert(cond: boolean): asserts cond {
  if (!cond) {
    throw new Error("Assertion failed");
  }
}
function parseIdentifier(tokens: Token[]): ast.Identifier {
  const tok = expect(TokenKind.IDENTIFIER, tokens);
  // TODO shouldn't need this
  assert(tok.kind === TokenKind.IDENTIFIER);
  return tok.id;
}

function parseFunction(tokens: Token[]): ast.Function {
  expect(TokenKind.KW_INT, tokens);
  let id = parseIdentifier(tokens);
  expect(TokenKind.LEFT_PAREN, tokens);
  expect(TokenKind.KW_VOID, tokens);
  expect(TokenKind.RIGHT_PAREN, tokens);
  expect(TokenKind.LEFT_CURLY, tokens);
  let body = parseStatement(tokens);
  expect(TokenKind.RIGHT_CURLY, tokens);
  return ast.Function(id, body);
}

export function parse(tokens: Token[]): ast.Program {
  const func = parseFunction(tokens);
  if (tokens.length !== 0) {
    fail(`Expected end of file. Instead found ${TokenKind[tokens[0].kind]}`);
  }
  return ast.Program(func);
}
