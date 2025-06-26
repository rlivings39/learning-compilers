import * as ast from "./ast";

import * as p from "ts-pattern";

import { Token, TokenKind } from "./lex";

function fail(msg: string): never {
  throw Error(msg);
}

function expect(expected: TokenKind, tokens: Token[]): Token {
  let token = tokens.shift();
  if (!token) {
    fail(`Unexpected end of file. Expected ${TokenKind[expected]}`);
  }
  if (token.kind !== expected) {
    fail(`Expected ${TokenKind[expected]}. Found ${TokenKind[token.kind]}}`);
  }
  return token;
}

function parseNumericConst(tokens: Token[]): ast.NumericConstant {
  const tok = expect(TokenKind.INT_CONSTANT, tokens);
  assert(tok.kind === TokenKind.INT_CONSTANT);
  return ast.NumericConstant(tok.value);
}

function parseExpr(tokens: Token[]): ast.Expr {
  return parseNumericConst(tokens);
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
  // TODO share code with expect
  const tok = expect(TokenKind.IDENTIFIER, tokens);
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
  return ast.Program(func);
}
