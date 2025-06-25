import { parseArgs } from "util";
import * as fs from "fs";
import { lex } from "./lex";

const USAGE = `
Usage: notcc [flags] input-file.c

Options:

--lex - Run the lexer but stop before parsing
--parse - Run the lexer and parser but stop before codegen
--codegen - Run the lexer, parser, codegen but stop before assembly generation
`;

export function parseAndCheckArguments(argv: string[]) {
  const { values, positionals } = parseArguments(argv);
  checkArguments(values, positionals);
  return { values, positionals };
}

function checkArguments<S extends { help?: boolean }, T>(
  values: S,
  positionals: T[]
) {
  if (values?.help) {
    return;
  }
  if (positionals.length !== 1) {
    throw Error("No input file specified\n" + USAGE);
  }

  if (Object.keys(values).length > 1) {
    throw Error("At most 1 flag may be passed\n" + USAGE);
  }
}

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

function readCode(fileName: string): string {
  const code = fs.readFileSync(fileName, {
    encoding: "utf-8",
  });

  return code;
}

export function driverMain(argv: string[]) {
  const { values, positionals } = parseAndCheckArguments(argv);
  if (values.help) {
    console.log(USAGE);
    return;
  }

  const fileName = positionals[0];
  const code = readCode(fileName);
  const tokens = lex(code);
}
