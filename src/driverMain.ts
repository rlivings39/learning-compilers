import { parseArgs } from "util";

const USAGE = `
Usage: the-cc [flags] input-file.c

Options:

--lex - Run the lexer but stop before parsing
--parse - Run the lexer and parser but stop before codegen
--codegen - Run the lexer, parser, codegen but stop before assembly generation
`;

function parseArguments(argv: string[]) {
  try {
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
        help: {
          type: "boolean",
          short: "h",
        },
      },
    });
    return { values, positionals };
  } catch (e: any) {
    const newError = new Error(`${e.message}\n${USAGE}`);
    throw newError;
  }
}

export function driverMain(argv: string[]) {
  const { values, positionals } = parseArguments(argv);
  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (positionals.length !== 1) {
    throw Error("No input file specified\n" + USAGE);
  }

  if (Object.keys(values).length > 1) {
    throw Error("At most 1 flag may be passed\n" + USAGE);
  }
}
