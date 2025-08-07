import { NotccError } from "./errors";

/**
 * Discriminator for the tokens
 */
export enum TokenKind {
  LEFT_PAREN,
  RIGHT_PAREN,
  LEFT_CURLY,
  RIGHT_CURLY,
  LEFT_SQUARE,
  RIGHT_SQUARE,
  KW_INT,
  KW_VOID,
  KW_RETURN,
  SEMICOLON,
  IDENTIFIER,
  INT_CONSTANT,
  UNARY_BITWISE_COMPLEMENT,
  LOGICAL_NOT,
  DECREMENT,
  MINUS,
  PLUS,
  TIMES,
  DIVIDE,
  REMAINDER,
  AND,
  OR,
  LESS,
  LESS_EQ,
  GREATER,
  GREATER_EQ,
  EQUAL,
  NOT_EQUAL,
  ASSIGN,
}

type SimpleTokenKind =
  | TokenKind.LEFT_PAREN
  | TokenKind.RIGHT_PAREN
  | TokenKind.LEFT_CURLY
  | TokenKind.RIGHT_CURLY
  | TokenKind.LEFT_SQUARE
  | TokenKind.RIGHT_SQUARE
  | TokenKind.KW_INT
  | TokenKind.KW_VOID
  | TokenKind.KW_RETURN
  | TokenKind.SEMICOLON
  | TokenKind.MINUS
  | TokenKind.UNARY_BITWISE_COMPLEMENT
  | TokenKind.DECREMENT
  | TokenKind.PLUS
  | TokenKind.DIVIDE
  | TokenKind.REMAINDER
  | TokenKind.TIMES
  | TokenKind.MINUS
  | TokenKind.AND
  | TokenKind.OR
  | TokenKind.LESS
  | TokenKind.LESS_EQ
  | TokenKind.GREATER
  | TokenKind.GREATER_EQ
  | TokenKind.EQUAL
  | TokenKind.NOT_EQUAL
  | TokenKind.LOGICAL_NOT
  | TokenKind.ASSIGN;

type UnaryTokenKind =
  | TokenKind.MINUS
  | TokenKind.UNARY_BITWISE_COMPLEMENT
  | TokenKind.DECREMENT
  | TokenKind.LOGICAL_NOT;

export type BinaryTokenKind =
  | TokenKind.PLUS
  | TokenKind.DIVIDE
  | TokenKind.REMAINDER
  | TokenKind.MINUS
  | TokenKind.TIMES
  | TokenKind.AND
  | TokenKind.OR
  | TokenKind.LESS
  | TokenKind.LESS_EQ
  | TokenKind.GREATER
  | TokenKind.GREATER_EQ
  | TokenKind.EQUAL
  | TokenKind.NOT_EQUAL
  | TokenKind.ASSIGN;

// Various token interfaces
interface SimpleToken {
  kind: SimpleTokenKind;
}

interface IdentifierToken {
  kind: TokenKind.IDENTIFIER;
  id: string;
}

interface IntConstToken {
  kind: TokenKind.INT_CONSTANT;
  value: number;
}

export interface UnaryToken {
  kind: UnaryTokenKind;
}

export interface BinaryToken {
  kind: BinaryTokenKind;
}

/**
 * Type for tokens returned by the lexer.
 */
export type Token =
  | SimpleToken
  | IdentifierToken
  | IntConstToken
  | UnaryToken
  | BinaryToken;

// Check that we've covered all TokenKinds in our Token union.
// If we miss one, the indexing in __exhaustive_check will error
type AllKinds = {
  [T in Token["kind"]]: number;
};

export function __exhaustive_check(ak: AllKinds, tk: TokenKind): number {
  return ak[tk];
}
interface TokenData {
  pattern: RegExp;
}

type TokenPatternMap = Record<TokenKind, TokenData>;
const PATTERN_MAP: TokenPatternMap = {
  [TokenKind.LEFT_PAREN]: { pattern: /^\(/ },
  [TokenKind.RIGHT_PAREN]: { pattern: /^\)/ },
  [TokenKind.LEFT_CURLY]: { pattern: /^\{/ },
  [TokenKind.RIGHT_CURLY]: { pattern: /^\}/ },
  [TokenKind.LEFT_SQUARE]: { pattern: /^\[/ },
  [TokenKind.RIGHT_SQUARE]: { pattern: /^\]/ },
  [TokenKind.KW_INT]: { pattern: /^int\b/ },
  [TokenKind.KW_VOID]: { pattern: /^void\b/ },
  [TokenKind.KW_RETURN]: { pattern: /^return\b/ },
  [TokenKind.SEMICOLON]: { pattern: /^;/ },
  [TokenKind.IDENTIFIER]: { pattern: /^[a-zA-z_]\w*\b/ },
  [TokenKind.INT_CONSTANT]: { pattern: /^[0-9]+\b/ },
  [TokenKind.MINUS]: { pattern: /^-/ },
  [TokenKind.DECREMENT]: { pattern: /^--/ },
  [TokenKind.UNARY_BITWISE_COMPLEMENT]: { pattern: /^~/ },
  [TokenKind.PLUS]: { pattern: /^\+/ },
  [TokenKind.DIVIDE]: { pattern: /^\// },
  [TokenKind.REMAINDER]: { pattern: /^%/ },
  [TokenKind.TIMES]: { pattern: /^\*/ },
  [TokenKind.LOGICAL_NOT]: { pattern: /^!/ },
  [TokenKind.AND]: { pattern: /^&&/ },
  [TokenKind.OR]: { pattern: /^\|\|/ },
  [TokenKind.LESS]: { pattern: /^</ },
  [TokenKind.LESS_EQ]: { pattern: /^<=/ },
  [TokenKind.GREATER]: { pattern: /^>/ },
  [TokenKind.GREATER_EQ]: { pattern: /^>=/ },
  [TokenKind.EQUAL]: { pattern: /^==/ },
  [TokenKind.NOT_EQUAL]: { pattern: /^!=/ },
  [TokenKind.ASSIGN]: { pattern: /^=/ },
};

function makeToken(match: string, kind: TokenKind): Token {
  switch (kind) {
    case TokenKind.IDENTIFIER: {
      return makeIdToken(match, kind);
    }
    case TokenKind.INT_CONSTANT: {
      return makeIntConstToken(match, kind);
    }
    case TokenKind.LEFT_PAREN:
    case TokenKind.RIGHT_PAREN:
    case TokenKind.LEFT_CURLY:
    case TokenKind.RIGHT_CURLY:
    case TokenKind.LEFT_SQUARE:
    case TokenKind.RIGHT_SQUARE:
    case TokenKind.KW_INT:
    case TokenKind.KW_VOID:
    case TokenKind.KW_RETURN:
    case TokenKind.SEMICOLON:
    case TokenKind.MINUS:
    case TokenKind.UNARY_BITWISE_COMPLEMENT:
    case TokenKind.DECREMENT:
    case TokenKind.PLUS:
    case TokenKind.TIMES:
    case TokenKind.DIVIDE:
    case TokenKind.REMAINDER:
    case TokenKind.LOGICAL_NOT:
    case TokenKind.AND:
    case TokenKind.OR:
    case TokenKind.LESS:
    case TokenKind.LESS_EQ:
    case TokenKind.GREATER:
    case TokenKind.GREATER_EQ:
    case TokenKind.EQUAL:
    case TokenKind.NOT_EQUAL:
    case TokenKind.ASSIGN: {
      return makeSimpleToken(match, kind);
    }
  }
}

function makeSimpleToken(
  match: string,
  kind: SimpleTokenKind
): SimpleToken | UnaryToken | BinaryToken {
  return { kind: kind };
}

function makeIdToken(match: string, _kind: TokenKind): IdentifierToken {
  return { kind: TokenKind.IDENTIFIER, id: match };
}

function makeIntConstToken(match: string, _kind: TokenKind): IntConstToken {
  return { kind: TokenKind.INT_CONSTANT, value: Number(match) };
}

export class Location {
  line: number;
  column: number;
  constructor(line: number, column: number) {
    this.line = line;
    this.column = column;
  }
}

export class LexError extends NotccError {
  location: Location;
  constructor(location: Location, message: string) {
    super(message);
    this.location = location;
  }
}

/**
 * Modifies code to strip out comments
 * replacing them with spaces while preserving
 * newlines. This is done to preserve source locations.
 *
 * @param code Character array of code
 */
function stripComments(code: string[]) {
  let index = 0;
  while (index < code.length - 1) {
    if (code[index] === "/") {
      if (code[index + 1] === "/") {
        // Line comment: Look for newline and replace with space
        let i = index;
        while (i < code.length && code[i] !== "\n") {
          code[i] = " ";
          ++i;
        }
        index = i + 1;
      } else if (code[index + 1] === "*") {
        /* Block comment: Look for closing tag and replace with spaces
         */
        code.splice(index, 2, " ", " ");
        let i = index + 2;
        while (
          i < code.length - 1 &&
          !(code[i] === "*" && code[i + 1] === "/")
        ) {
          if (code[i] !== "\n") {
            code[i] = " ";
          }
          ++i;
        }
        if (i === code.length - 1) {
          throw new NotccError("Unterminated block comment");
        } else {
          code.splice(i, 2, " ", " ");
        }
        index = i + 1;
      } else {
        ++index;
      }
    } else {
      ++index;
    }
  }
}

/**
 * Run the lexer on input code
 *
 * @param code the input code as a string
 * @returns array of tokens or throws LexError
 */
export function lex(code: string): Token[] {
  const codeBuffer = Array.from(code);
  stripComments(codeBuffer);
  code = codeBuffer.join("");
  const tokens: Token[] = [];
  code = code.trimStart();
  while (code.length > 0) {
    let match: string = "";
    let matchKind: TokenKind = 0;
    for (const [kind, { pattern }] of Object.entries(PATTERN_MAP)) {
      const thisMatch = code.match(pattern);
      // Found a longer match
      if (thisMatch && thisMatch[0].length > match.length) {
        match = thisMatch[0];
        // TODO converting to number is sketchy
        matchKind = Number(kind);
      }
    }
    // TODO error location
    if (match.length === 0) {
      throw new LexError(
        { line: 0, column: 0 },
        `Unable to lex code: ${code.substring(0, 10)}`
      );
    }
    tokens.push(makeToken(match, matchKind));
    code = code.slice(match.length).trimStart();
  }
  return tokens;
}

export const forTestingOnly = {
  stripComments,
};
