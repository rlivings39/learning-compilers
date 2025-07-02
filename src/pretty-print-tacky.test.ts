import { test, expect } from "vitest";
import { astToTacky } from "./ast-to-tacky";
import { parse } from "./parse";
import { lex } from "./lex";
import { prettyPrintTacky } from "./pretty-print-tacky";
test("Pretty print TACKY", () => {
  const main1 = "int main(void) { return -(~(-(-(4)))); }";
  const tacky1 = astToTacky(parse(lex(main1)));
  const expected1 = `Function main () {
  Uminus($4, %tmp.3)
  Uminus(%tmp.3, %tmp.2)
  BitComp(%tmp.2, %tmp.1)
  Uminus(%tmp.1, %tmp.0)
  Return(%tmp.0)
}`;
  expect(prettyPrintTacky(tacky1)).toEqual(expected1);
});
