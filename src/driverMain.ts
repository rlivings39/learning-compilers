import {
  inspect,
  parseArgs,
  ParseArgsOptionDescriptor,
  ParseArgsOptionsConfig,
} from "util";
import * as fs from "fs";
import { lex, TokenKind } from "./lex";
import { parse } from "./parse";
import { prettyPrint } from "./pretty-print";
import { tackyToAsm } from "./asm";
import { emitAsm } from "./emit";
import path from "path";
import * as cp from "child_process";
import { NotccError } from "./errors";
import { astToTacky } from "./ast-to-tacky";
import { prettyPrintTacky } from "./pretty-print-tacky";

class CliError extends NotccError {}
interface NotccFlag extends ParseArgsOptionDescriptor {
  help: string;
}
interface NotccFlags extends ParseArgsOptionsConfig {
  [longOption: string]: NotccFlag;
}

function renderUsage(flags: NotccFlags) {
  let usage = `
Usage: notcc [flags] /path/to/input-file.c

Compiles input-file.c creating an executable /path/to/input-file using the system gcc

Options:

`;
  const flagList = [];
  let maxLen = 0;
  for (const [flag, opts] of Object.entries(flags)) {
    let newFlag = "";
    if (opts.short) {
      newFlag += `-${opts.short}, `;
    }
    newFlag += `--${flag}`;
    flagList.push([newFlag, opts.help]);
    maxLen = Math.max(maxLen, newFlag.length);
  }

  flagList.forEach((flagAndHelp) => {
    const [flag, help] = flagAndHelp;
    const padding = maxLen - flag.length;
    usage += `${flag}` + " ".repeat(padding) + ` ${help}\n`;
  });
  return usage;
}

const NOTCC_CLI_FLAGS: NotccFlags = {
  lex: {
    type: "boolean",
    default: false,
    help: "Run the lexer but stop before parsing",
  },
  "print-tokens": {
    type: "boolean",
    help: "Print out the tokens found by the lexer",
  },
  parse: {
    type: "boolean",
    default: false,
    help: "Run the lexer and parser but stop before codegen",
  },
  "pretty-print": {
    type: "boolean",
    default: false,
    help: "Pretty print the output of the parser",
  },
  tacky: {
    type: "boolean",
    default: false,
    help: "Run the lexer, parser, and TACKY IR generation stopping before assembly generation",
  },
  "pretty-print-tacky": {
    type: "boolean",
    default: false,
    help: "Pretty print TACKY IR after generation",
  },
  codegen: {
    type: "boolean",
    default: false,
    help: "Run the lexer, parser, codegen but stop before assembly generation",
  },
  "asm-only": {
    type: "boolean",
    default: false,
    help: "Emit assembly in input-file.s rather than linking an executable",
    short: "S",
  },
  help: {
    type: "boolean",
    short: "h",
    help: "Show the help",
  },
};

export function parseArguments(argv: string[]) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: NOTCC_CLI_FLAGS,
    });
    if (values?.help) {
      return { values, positionals };
    }
    if (positionals.length !== 1) {
      throw new CliError("No input file specified");
    }

    if (
      Number(values.lex) +
        Number(values.codegen) +
        Number(values.parse) +
        Number(values.tacky) >
      1
    ) {
      throw new CliError("At most 1 flag may be passed");
    }

    return { values, positionals };
  } catch (e: unknown) {
    if (e instanceof CliError) {
      const newError = new CliError(
        `${e.message}\n${renderUsage(NOTCC_CLI_FLAGS)}`
      );
      throw newError;
    }
    throw e;
  }
}

function readCode(fileName: string): string {
  const code = fs.readFileSync(fileName, {
    encoding: "utf-8",
  });

  return code;
}

export function driverMain(argv: string[]) {
  const { values, positionals } = parseArguments(argv);
  if (values.help) {
    console.log(renderUsage(NOTCC_CLI_FLAGS));
    return;
  }

  const fileName = positionals[0];
  const code = readCode(fileName);
  const tokens = lex(code);
  if (values["print-tokens"]) {
    console.log(
      "Tokens\n" +
        inspect(
          tokens.map((t) => {
            return { ...t, kind: TokenKind[t.kind] };
          })
        )
    );
  }
  if (values.lex) {
    return;
  }
  const ast = parse(tokens);
  if (values["pretty-print"]) {
    console.log(prettyPrint(ast));
  }
  if (values.parse) {
    return;
  }

  const tacky = astToTacky(ast);

  if (values["pretty-print-tacky"]) {
    console.log(prettyPrintTacky(tacky));
  }
  if (values.tacky) {
    return;
  }

  const asm = tackyToAsm(tacky);
  if (values.codegen) {
    return;
  }

  const asmCode = emitAsm(asm);
  const outAsmFilePath = {
    ...path.parse(fileName),
    ext: ".s",
    base: "",
  };
  const outAsmFileName = path.format(outAsmFilePath);
  fs.writeFileSync(outAsmFileName, asmCode, { encoding: "utf-8", flush: true });
  if (values["asm-only"]) {
    return;
  }
  const outExeFileName = path.format({ ...outAsmFilePath, ext: "" });
  try {
    cp.execSync(`gcc ${outAsmFileName} -o ${outExeFileName}`, {
      stdio: "pipe",
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new NotccError(`Gcc error: ${e.message}`);
    }
    throw e;
  }
}
