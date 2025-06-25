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

type TokenPatternMap = Map<TokenKind, RegExp>;
const PATTERN_MAP: TokenPatternMap = new Map([
  [TokenKind.LEFT_PAREN, /^\(/],
  [TokenKind.RIGHT_PAREN, /^\)/],
  [TokenKind.LEFT_CURLY, /^\{/],
  [TokenKind.RIGHT_CURLY, /^\}/],
  [TokenKind.LEFT_SQUARE, /^\[/],
  [TokenKind.RIGHT_SQUARE, /^\]/],
  [TokenKind.KW_INT, /^int\b/],
  [TokenKind.KW_VOID, /^void\b/],
  [TokenKind.KW_RETURN, /^return\b/],
  [TokenKind.SEMICOLON, /^;/],
  [TokenKind.IDENTIFIER, /^[a-zA-z_]\w*\b/],
  [TokenKind.INT_CONSTANT, /^[0-9]+\b/],
]);

// Various token interfaces
export interface Token {
  kind: TokenKind;
}

export interface IdentiferToken extends Token {
  id: string;
}

export interface IntConstToken extends Token {
  value: number;
}

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
 * Run the lexer on input code
 *
 * @param code the input code as a string
 * @returns array of tokens or throws LexError
 */
export function lex(code: string): Token[] {
  let tokens: Token[] = [];
  code = code.trimStart();
  while (code.length > 0) {
    let match: RegExpMatchArray | null = null;
    let matchKind: TokenKind | null = null;
    for (let [kind, pattern] of PATTERN_MAP.entries()) {
      // TODO need to compare match length?
      match = code.match(pattern);
      matchKind = kind;
      if (match) {
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
    switch (matchKind) {
      case TokenKind.LEFT_PAREN: {
        tokens.push({ kind: matchKind });
        break;
      }
    }
  }
  return tokens;
}
