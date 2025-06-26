import { test, expect } from "vitest";
import { lex } from "./lex";
import { parse } from "./parse";
import { prettyPrint } from "./pretty-print";

test("Parsing", () => {
  const mainProg = `
  int main (void) {
    return 2;
  }`;

  const tokens = lex(mainProg);
  const prog = parse(tokens);
  expect(prettyPrint(prog).trim()).toEqual(`Program (
  Function main() {
    return 2;
  }
)`);
  const mainProgJunk = mainProg + "}";
  const tokens2 = lex(mainProgJunk);
  expect(() => parse(tokens2)).toThrow();
});
