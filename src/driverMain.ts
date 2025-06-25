import { parseArgs } from "util";

const USAGE = `
Usage: the-cc [flags] input-file.c
----------------------------------
--lex - Run the lexer but stop before parsing
--parse - Run the lexer and parser but stop before codegen
--codegen - Run the lexer, parser, codegen but stop before assembly generation
`;

export function driverMain(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      lex: {
        type: "boolean",
      },
      parse: {
        type: "boolean",
      },
      codegen: {
        type: "boolean",
      },
    },
  });

  if (positionals.length !== 1) {
    throw Error("No input file specified\n" + USAGE);
  }

  if (Object.keys(values).length > 1) {
    throw Error("At most 1 flag may be passed\n" + USAGE);
  }
  return 0;
}
