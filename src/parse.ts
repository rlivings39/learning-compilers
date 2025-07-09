import * as ast from "./ast";
import { NotccError } from "./errors";

import {
  BinaryToken,
  BinaryTokenKind,
  Token,
  TokenKind,
  UnaryToken,
} from "./lex";

function fail(msg: string): never {
  throw new NotccError(msg);
}

function renderExpectedTokens(expected: TokenKind[]): string {
  return expected.map((t) => TokenKind[t]).join(", ");
}

function expect(expected: TokenKind | TokenKind[], tokens: Token[]): Token {
  const token = tokens.shift();
  if (!Array.isArray(expected)) {
    expected = [expected];
  }
  if (!token) {
    fail(`Unexpected end of file. Expected ${renderExpectedTokens(expected)}`);
  }
  if (!expected.includes(token.kind)) {
    fail(
      `Expected ${renderExpectedTokens(expected)}. Found ${
        TokenKind[token.kind]
      }`
    );
  }
  return token;
}

function parseNumericConst(tokens: Token[]): ast.NumericConstant {
  const tok = expect(TokenKind.INT_CONSTANT, tokens);
  assert(tok.kind === TokenKind.INT_CONSTANT);
  return ast.NumericConstant(tok.value);
}

function parseUnary(token: UnaryToken, tokens: Token[]): ast.UnaryExpr {
  expect(token.kind, tokens);
  const expr = parseFactor(tokens);
  switch (token.kind) {
    case TokenKind.MINUS: {
      return ast.UnaryMinus(expr);
    }
    case TokenKind.UNARY_BITWISE_COMPLEMENT: {
      return ast.Complement(expr);
    }
    case TokenKind.DECREMENT: {
      fail(`-- is not supported`);
      return ast.Complement(expr);
    }
    default: {
      const _check: never = token.kind;
      return _check;
    }
  }
}

const OP_PRECEDENCE: Record<BinaryTokenKind, number> = {
  [TokenKind.PLUS]: 45,
  [TokenKind.MINUS]: 45,
  [TokenKind.DIVIDE]: 50,
  [TokenKind.TIMES]: 50,
  [TokenKind.REMAINDER]: 50,
};

function binopPrecedence(token: BinaryToken) {
  return OP_PRECEDENCE[token.kind];
}

function isBinOp(token: Token): token is BinaryToken {
  return token.kind in OP_PRECEDENCE;
}

function binopTokenToName(token: BinaryToken): ast.BinaryOpName {
  switch (token.kind) {
    case TokenKind.PLUS: {
      return "plus";
    }
    case TokenKind.MINUS: {
      return "subtract";
    }
    case TokenKind.DIVIDE: {
      return "divide";
    }
    case TokenKind.TIMES: {
      return "multiply";
    }
    case TokenKind.REMAINDER: {
      return "remainder";
    }
  }
}

function parseBinop(tokens: Token[]): ast.BinaryOpName {
  const t = expect(
    [
      TokenKind.PLUS,
      TokenKind.MINUS,
      TokenKind.DIVIDE,
      TokenKind.TIMES,
      TokenKind.REMAINDER,
    ],
    tokens
  );
  // TODO can we get rid of the cast?
  return binopTokenToName(t as BinaryToken);
}

function parseExpr(tokens: Token[], minPrecedence: number): ast.Expr {
  let left = parseFactor(tokens);
  let nextToken = tokens[0];
  while (isBinOp(nextToken) && binopPrecedence(nextToken) >= minPrecedence) {
    const operator = parseBinop(tokens);
    const right = parseExpr(tokens, binopPrecedence(nextToken) + 1);
    // Operators are left-associative so that
    //   1 + 2 - 3
    // becomes
    //   (1+2) - 3
    left = ast.BinaryExpr(operator, left, right);
    nextToken = tokens[0];
  }
  return left;
}

function parseFactor(tokens: Token[]): ast.Expr {
  const token = tokens[0];
  switch (token.kind) {
    case TokenKind.LEFT_PAREN: {
      expect(TokenKind.LEFT_PAREN, tokens);
      const expr = parseExpr(tokens, 0);
      expect(TokenKind.RIGHT_PAREN, tokens);
      return expr;
    }
    case TokenKind.INT_CONSTANT: {
      return parseNumericConst(tokens);
    }
    case TokenKind.MINUS:
    case TokenKind.UNARY_BITWISE_COMPLEMENT:
    case TokenKind.DECREMENT: {
      // TODO remove this cast
      return parseUnary(token as UnaryToken, tokens);
    }
    // TODO is it good to list these out? Probably
    case TokenKind.RIGHT_PAREN:
    case TokenKind.LEFT_CURLY:
    case TokenKind.RIGHT_CURLY:
    case TokenKind.LEFT_SQUARE:
    case TokenKind.RIGHT_SQUARE:
    case TokenKind.KW_INT:
    case TokenKind.KW_VOID:
    case TokenKind.KW_RETURN:
    case TokenKind.SEMICOLON:
    case TokenKind.IDENTIFIER:
    case TokenKind.PLUS:
    case TokenKind.TIMES:
    case TokenKind.DIVIDE:
    case TokenKind.REMAINDER:
    default: {
      fail(`Failed to parse ${TokenKind[token.kind]}. Expected an expression.`);
    }
  }
}

function parseStatement(tokens: Token[]): ast.Stmt {
  expect(TokenKind.KW_RETURN, tokens);
  const expr = parseExpr(tokens, 0);
  expect(TokenKind.SEMICOLON, tokens);
  return ast.ReturnStmt(expr);
}

function assert(cond: boolean): asserts cond {
  if (!cond) {
    throw new NotccError("Assertion failed");
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
  const id = parseIdentifier(tokens);
  expect(TokenKind.LEFT_PAREN, tokens);
  expect(TokenKind.KW_VOID, tokens);
  expect(TokenKind.RIGHT_PAREN, tokens);
  expect(TokenKind.LEFT_CURLY, tokens);
  const body = parseStatement(tokens);
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
