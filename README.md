# learning-compilers

This is my attempt at working through [*Writing a C Compiler*](https://norasandler.com/book/) by Nora Sandler. The compiler is written in TypeScript leveraging its functional programming abilities.

[NQCC2](https://github.com/nlsandler/nqcc2) is the author's reference implementation.

The [tests](https://github.com/nlsandler/writing-a-c-compiler-tests/) provided with the book can be used along with in-project tests.

## Installing and using this repo

Download the repo and

```bash
cd learning-compilers
npm install
npm run build
```

Then you can run the compiler by executing `./dist/main.js`. See the help for up to date info:

```bash
$./dist/main.js -h

Usage: notcc [flags] /path/to/input-file.c

Compiles input-file.c creating an executable /path/to/input-file using the system gcc

Options:

--lex           Run the lexer but stop before parsing
--print-tokens  Print out the tokens found by the lexer
--parse         Run the lexer and parser but stop before codegen
--pretty-print  Pretty print the output of the parser
--codegen       Run the lexer, parser, codegen but stop before assembly generation
--asm-only (-S) Emit assembly in input-file.s rather than linking an executable
--help (-h)     Show the help
```

Running `npm link` will let you refer to this with its name `notcc`.

## The four compiler passes

The general flow is `lexer -> parser -> assembly generation -> code emission`.

1. The **lexer** breaks up the source code into a list of **tokens**. Tokens are the smallest syntactic units of a language like operators, keywords, delimiters, and identifiers.
2. The **parser** converts the tokens into an **abstract syntax tree**
3. The **assembly generation** pass converts the AST into assembly in memory (not text).
4. The **code emission** pass writes assembly code to a file to be assembled and linked.

Compiling a simple C program

```c
int main(void) {
  return 2;
}
```

produces

```s
  .text
  .globl main
  .type main, @function
main:
  movl $2, %eax
  ret
```

where lines starting with `.` are assembler directives. `main` is a label for the code following it.

The `movl` instruction does a long move of the value 2 into the register `eax` to match the calling convention. `long` in x64 assembly is 32-bits and quad is 64-bits. `rax` is the 64-bit corresponding register.

When the linker runs, it adds a bit of code `crt0` which calls `main`, gets the return value, and calls the system `exit` forwarding the output of `main`.

### Lexing

The lexer turns input code into a stream of tokens. It is based on recognizing tokens like keywords and identifiers.

The book summarizes the algorithm as

1. Remove leading whitespace
2. Apply token regexes
3. Error if no matches
4. Choose largest matching one
5. Continue on remainder of string until empty

In (4) we choose the longest match to be able to differentiate things like `--` from `-`.

### Parsing

After lexing the parser analyzes the tokens and groups them into their hierarchical structure to represent the user's program. A tree structure is natural here. Parsers produce an **abstract syntax tree** (AST).

Parsers can either be handwritten or produced by a parser generator like Bison, Yacc, or ANTLR. Handwritten recursive descent or Pratt parsers can give much better flexibility and error reporting.

GCC and Clang both use handwritten parsers.

The book introduces and uses the Zephyr [Abstract Data Syntax Language](https://www.cs.princeton.edu/~appel/papers/asdl97.pdf) (ASDL) to represent ASTs.

The author recommends using algebraic types where possible to implement the AST. See ["Abstract Syntax Tree Implementation Idioms"](https://hillside.net/plop/plop2003/Papers/Jones-ImplementingASTs.pdf) for various strategies in a number of languages.

An AST omits details that are necessary for the programming language like "statements end with a semicolon", hence the "abstract". To convert from a token stream to an AST one needs a **formal grammar** that specifies rules showing how to build language constructs from tokens.

For the simple language supported in chapter 1 the formal grammar is

```bnf
<program> ::= <function>
<function> ::= "int" <identifier> "(" "void" ")" "{" <statement> "}"
<statement> ::= "return" <expr> ";"
<expr> ::= <int> | <unop> <expr> | "(" <expr> ")"
<identifier> ::= ? An identifier token ?
<int> ::= ? A constant token ?
<unop> ::= "-" | "~"
```

This is in **extended Backus-Naur form** (EBNF). Each line is a **production** defining how languages constructs are defined in terms of other constructs and tokens. Symbols that appear on the lhs of rules are **non-terminal symbols**. Individual tokens are **terminal symbols**.

Non-terminals are wrapped in `<>` and terminals are wrapped in `""`. Identifiers and constants are terminals without explicit representations. They are **special sequences** shown as English phrases wrapped with `? ?`.

Multiple options for a production are separated by `|` and square brackets show optional parts of a rule.

### Recursive descent parsing

**Recursive descent parsing** uses a different function to parse each non-terminal symbol and return the resulting AST node.

The book shows an example of statement parsing

```python
parse_statement(tokens):
  expect("return", tokens)
  return_val = parse_expr(tokens)
  expect(";", tokens)
  return Return(return_val)

expect(expected, tokens):
  actual = take_token(tokens)
  if actual != expected:
    fail(f"Syntax error. Expected {expected}. Found {actual}")
```

Note that this consumes tokens so that the caller of `parse_statement` then just continues on after finishing this statement. If there are any remaining tokens after parsing the program, that is a syntax error.

Parsers that look at the next few tokens to determine what to do are called **predictive parsers**. The alternative is **recursive descent with backtracking** where each production rule is tried until one is found that works. Failures result in adding the tokens back to the stream.

A pretty-printer can be useful to visualize your AST and debug. You should also generate informative error messages.

## Three address code (TAC) and the book's TACKY IR

The book introduces the idea of three address code IR which represents the program using nodes with up to 3 addresses, 2 source addresses and 1 destination address. This works well for values, unary, and binary operations and maps more closely to assembly while being easier to optimize later on.

The TAC for an expression like `1 + 2 * 3` might look like

```
tmp0 = 2 * 3
tmp1 = 1 + tmp0
return tmp1
```

## Assembly generation

The next phase we cover is assembly generation. Here we produce another data structure that represents the assembly in memory so that it can be modified in subsequent passes in the future.

This new data structure is another AST.

## Code emission

This stage generates assembly code to a file on disk. The format will change a bit depending on the target platform. For linux always include

```s
.section .note.GNU-stack,"",@progbits
```

This line disables having an **executable stack** so that data in the stack can't be executed. Avoiding an executable stack is a security measure. Executable stacks are normally not needed except under special circumstances.

## Implementing unary operators

Chapter 2 adds in unary operators `-` and `~`. For the C program

```c
int main(void) {
  return ~(-2);
}
```

you might see assembly like (assuming C compilers didn't constant fold)

```s
  .globl main
main:
  # Function prologue
  # 1. Save the caller's base pointer on the stack
  pushq %rbp
  # 2. Save the position of the new stack frame in the base pointer
  moveq %rsp, %rbp
  # 3. Allocate 8 bytes of space on the stack for the stack frame
  subq  $8, %rsp
  # Store 2 on the stack and negate it
  movl  $2, -4(%rbp)
  negl  -4(%rbp)
  # Move negated value to a register since both operands to
  # following movl can't be in memory
  movl  -4(%rbp), %r10d
  movl  %r10d, -8(%rbp)
  # Bitwise complement
  notl  -8(%rbp)
  # Move result to return register
  movl  -8(%rbp), %eax
  # Function epilogue
  # 1. Reset the stack pointer to the base pointer
  movq  %rbp, %rsp
  # 2. Restore the caller's base pointer
  popq  %rbp
  ret
```

## The program stack

The **stack** is a special part of program memory. The register `%rsp` points to the top of the stack, i.e. it's the **stack pointer**. Namely, the last used entry on the stack rather than the first free entry.

The stack grows in towards decreasing memory addresses.

The `push` and `pop` instructions work on this stack. An instruction like `push $3` does a few things. The value is pushed into the next available entry and the stack pointer is adjusted. On a 64-bit system the next stack entry is `RSP-8`. After the operation `%rsp` is the address of the new entry.

`pop %rax` copies the value at the top of the stack into `rax` and decreases the stack by 1 entry (increments the stack pointer by 8 bytes).

`pushw, popw` can work with **words** or 2-byte values.

When a function is called it allocates space on the stack for local variables and temporaries called a **stack frame**. The base of this frame is stored in `%rbp`, called the **base pointer**. All stack entries for the function can be referred to relative to RBP rather than with an explicit address. So a local variable might look like `-4(%rbp)` (remember, the stack grows toward decreasing addresses).



## Notes on the book

* Chapter 1 pp. 10 - Testing the lexer involves dealing with comments though the book doesn't mention them. It would have been useful for me to see a few sentences on how those are usually handled in a compiler. E.g. Does the lexer handle them, maybe they're stripped out in a pre-pass, or maybe they're left in place but ignored by the lexer?
* Chapter 1 - It wasn't clear to me at all that my compiler should be invoking the system compiler to build an executable from my assembly output. After failing the tests and reading the test harness, I finally got the idea. Stating this in the book would have saved me time and confusion.
