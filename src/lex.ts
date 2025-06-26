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
}

type TokenFactory = (match: string, kind: TokenKind) => Token;
interface TokenData {
  pattern: RegExp;
  factory: TokenFactory;
}

function makeSimpleToken(match: string, kind: TokenKind): SimpleToken {
  return { kind: kind };
}

function makeIdToken(match: string, kind: TokenKind): IdentifierToken {
  return { kind: TokenKind.IDENTIFIER, id: match };
}

function makeIntConstToken(match: string, kind: TokenKind): IntConstToken {
  return { kind: TokenKind.INT_CONSTANT, value: Number(match) };
}

type TokenPatternMap = Map<TokenKind, TokenData>;
const PATTERN_MAP: TokenPatternMap = new Map([
  [TokenKind.LEFT_PAREN, { pattern: /^\(/, factory: makeSimpleToken }],
  [TokenKind.RIGHT_PAREN, { pattern: /^\)/, factory: makeSimpleToken }],
  [TokenKind.LEFT_CURLY, { pattern: /^\{/, factory: makeSimpleToken }],
  [TokenKind.RIGHT_CURLY, { pattern: /^\}/, factory: makeSimpleToken }],
  [TokenKind.LEFT_SQUARE, { pattern: /^\[/, factory: makeSimpleToken }],
  [TokenKind.RIGHT_SQUARE, { pattern: /^\]/, factory: makeSimpleToken }],
  [TokenKind.KW_INT, { pattern: /^int\b/, factory: makeSimpleToken }],
  [TokenKind.KW_VOID, { pattern: /^void\b/, factory: makeSimpleToken }],
  [TokenKind.KW_RETURN, { pattern: /^return\b/, factory: makeSimpleToken }],
  [TokenKind.SEMICOLON, { pattern: /^;/, factory: makeSimpleToken }],
  [TokenKind.IDENTIFIER, { pattern: /^[a-zA-z_]\w*\b/, factory: makeIdToken }],
  [
    TokenKind.INT_CONSTANT,
    { pattern: /^[0-9]+\b/, factory: makeIntConstToken },
  ],
]);

// Various token interfaces
interface SimpleToken {
  kind:
    | TokenKind.LEFT_PAREN
    | TokenKind.RIGHT_PAREN
    | TokenKind.LEFT_CURLY
    | TokenKind.RIGHT_CURLY
    | TokenKind.LEFT_SQUARE
    | TokenKind.RIGHT_SQUARE
    | TokenKind.KW_INT
    | TokenKind.KW_VOID
    | TokenKind.KW_RETURN
    | TokenKind.SEMICOLON;
}

interface IdentifierToken {
  kind: TokenKind.IDENTIFIER;
  id: string;
}

interface IntConstToken {
  kind: TokenKind.INT_CONSTANT;
  value: number;
}

/**
 * Type for tokens returned by the lexer.
 */
export type Token = SimpleToken | IdentifierToken | IntConstToken;

export class Location {
  line: number;
  column: number;
  constructor(line: number, column: number) {
    this.line = line;
    this.column = column;
  }
}

export class LexError extends Error {
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
          throw new Error("Unterminated block comment");
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
  let codeBuffer = Array.from(code);
  stripComments(codeBuffer);
  code = codeBuffer.join("");
  let tokens: Token[] = [];
  code = code.trimStart();
  while (code.length > 0) {
    let match: RegExpMatchArray | null = null;
    for (let [matchKind, { pattern, factory }] of PATTERN_MAP.entries()) {
      // TODO need to compare match length?
      match = code.match(pattern);
      if (match) {
        tokens.push(factory(match[0], matchKind));
        break;
      }
    }
    // TODO error location
    if (match === null) {
      throw new LexError(
        { line: 0, column: 0 },
        `Unable to lex code: ${code.substring(0, 10)}`
      );
    }
    code = code.slice(match[0].length).trimStart();
  }
  return tokens;
}

export const forTestingOnly = {
  stripComments,
};
