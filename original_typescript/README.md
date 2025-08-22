# Legacy TypeScript implementation

This directory contains the legacy TypeScript implementation of `notcc`. It's left here for my reference and posterity. All new development is done in Rust in the main [src](../src) folder.

## Installing and using this repo

Download the repo and

```bash
cd learning-compilers
npm install
npm run build
npm run test
```

to configure, build, and run the tests.

Then you can run the compiler by executing `./dist/main.js`. See the help for up to date info:

```bash
$./dist/main.js -h

Usage: notcc [flags] /path/to/input-file.c

Compiles input-file.c creating an executable /path/to/input-file using the system gcc

Options:

--lex                Run the lexer but stop before parsing
--print-tokens       Print out the tokens found by the lexer
--parse              Run the lexer and parser but stop before codegen
--pretty-print       Pretty print the output of the parser
--tacky              Run the lexer, parser, and TACKY IR generation stopping before assembly generation
--pretty-print-tacky Pretty print TACKY IR after generation
--codegen            Run the lexer, parser, codegen but stop before assembly generation
-S, --asm-only       Emit assembly in input-file.s rather than linking an executable
-h, --help           Show the help
```

Running `npm link` will let you refer to this with its name `notcc`.

