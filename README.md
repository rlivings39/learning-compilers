# learning-compilers

This is my attempt at working through [*Writing a C Compiler*](https://norasandler.com/book/) by Nora Sandler. The compiler is written in Rust.

[NQCC2](https://github.com/nlsandler/nqcc2) is the author's reference implementation.

The [tests](https://github.com/nlsandler/writing-a-c-compiler-tests/) provided with the book can be used along with in-project tests.

## Current status

This compiler is complete through Chapter 6 of the book meaning it compiles programs of the form

```c
int main(void) {
  int x = 3;
  int y = 2;
  if (y)
    return x > y ? 1 : 0;
  else
    return ~(-4) * (x + 12) || y > 12;
}
```

for any combination of `~, -`, binary ops `+, -, *, /, %, <, <=, >, >=, ==, !=, !, &&, ||`, parentheses, `int` variables, if/else, conditional expressions (`?:`), and any integer constants.

See the [current grammar](#current-grammar) section for full details of what is supported.

## Installing and using this repo

Download the repo and

```bash
cd learning-compilers
cargo build
cargo test
```

to configure, build, and run the tests.

Then you can run the compiler by executing `cargo run - arg1 arg2` or executing the right binary in `target/`. See the help for up to date info:

```bash
$ cargo run - -h
Compiles /path/to/input-file.c creating an executable /path/to/input-file

Usage: notcc [OPTIONS] <C_FILE>

Arguments:
  <C_FILE>  Input C source file

Options:
      --lex                     Run the lexer but stop before parsing
      --print-tokens            Print out the tokens found by the lexer
      --parse                   Run the lexer and parser but stop before codegen
      --pretty-print            Pretty print the output of the parser
      --pretty-print-semantics  Pretty print the output of semantic analysis
      --validate                Run up to the parser and semantic analysis
      --tacky                   Run the lexer, parser, and TACKY IR generation stopping before assembly generation
      --pretty-print-tacky      Pretty print TACKY IR after generation
      --codegen                 Run the lexer, parser, codegen but stop before assembly generation
  -S, --asm-only                Emit assembly in input-file.s rather than linking an executable
  -h, --help                    Print help (see more with '--help')
  -V, --version                 Print version
```

See [original_typescript/README.md](original_typescript/README.md) for instructions on using the original TypeScript implementation.

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

## Semantic analysis

Semantic analysis runs on the AST created by the parser. It works to understand the meaning of the syntax in the AST. For example, `2 = 3` is valid syntax in our grammar. However, this is semantically invalid.

This pass also makes variable names globally unique so we can easily refer to them in later passes and assembly.

**Note** This compiler does **not** implement `typedef`. Doing so requires doing semantic analysis during parsing because the meaning of syntax changes based on what an identifier represents. Consider `return (foo) *x;`

If we have `typedef int foo` then this dereferences `x` and casts the result to int. If `foo` is a variable, then this multiplies `foo` by `x`.

This means that C has a **context sensitive** grammar rather than a **context-free** grammar.

To support `typedef` we'd need to move symbol resolution into the parser so we can know what each identifier refers to.

The book recommends checking out [*The context sensitivity of C's grammar
*](https://eli.thegreenplace.net/2007/11/24/the-context-sensitivity-of-cs-grammar/) by Eli Bendersky for more details on
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

When representing assembly in the compiler, one can choose at what level and fidelity to do so.

The book introduces the idea of **pseudo registers**, things that can be used like registers in our assembly IR but that can't map directly to real registers as we use an unlimited supply of pseudo registers.

### Arithmetic in assembly

The arithmetic operators map to instructions

| Instruction | Meaning |
| --- | --- |
| `addl $2, %eax` | eax = eax + 2 |
| `subl $2, %eax` | eax = eax - 2 |
| `imull $2, %eax` | eax = eax * 2 |

so that the destination operand is the lhs operand.

Division is more complicated but done with `idiv`. `idiv` divides a signed value in the `AX, DX:AX, or EDX:EAX` (dividend) by the source operand (divisor) and stores the result in the `AX (AH:AL), DX:AX, or EDX:EAX` registers.

For a 32-bit division, the dividend must be sign extended to fill `EDX:EAX`. This can be done with `cdq`.

The operand to `idiv` also cannot be an immediate.

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

## Implementing binary operators

Binary operators provide other issues such as **precedence** and **associativity** that need to be handled. Operators have varying precedence, meaning which is evaluated first. `1 + 2 * 3` is evaluated as `1 + (2 * 3)`.

They can also be **left-associative** or **right-associative**. For left-associative you apply the operator on the left first and similarly for right-associative. `+,-,*,/,%` are left associative so that `1 + 2 - 3` is equivalent to `(1 + 2) - 3`.

A simple grammar rule for binary expressions could be

```bnf
<expr> ::= <int> | <unop> <expr> | "(" <expr> ")" | <expr> <binop> <expr>
```

This is **ambiguous** because it doesn't specify the precedence of operators.

It is also **left-recursive** because the leftmost symbol in the production for `<expr>` is `<expr>`. Blind recursive descent would fail to terminate as the recursive call would consume no tokens.

To address these issues we can refactor the grammar to split out rules for each precedence level

```bnf
<expr> ::= <term> { ("+" | "-") <term> }
<term> ::= <factor> { ("*" | "/" | "%" ) }
<factor> ::= <int> | <unop> <factor> | "(" <expr> ")"
```

The `{}` indicates repetition and would match `1 + 2 - 3`. Parsing would then associate the operations in the AST using left-associativity.

Such an approach would work but gets unwieldy as you have to have a different rule for each precedence level (and associated parser functions) generating a lot of boilerplate.

### Better solution: precedence climbing

Precedence climbing can be used to parse expressions like `<expr> <binop> <expr>` effectively. Conceptually, each operator is assigned a numeric precedence and the `parse_expr` function also takes a numeric precedence as argument. When figuring out what the operands are to a given operator only operators with higher precedence will be parsed.

The chapter 2 grammar with binary operators is then

```bnf
<program> ::= <function>
<function> ::= "int" <identifier> "(" "void" ")" "{" <statement> "}"
<statement> ::= "return" <expr> ";"
<expr> ::= <factor> | <expr> <binop> <expr>
<factor> ::= <int> | <unop> <expr> | "(" <expr> ")"
<identifier> ::= ? An identifier token ?
<int> ::= ? A constant token ?
<unop> ::= "-" | "~"
<binop> ::= "-" | "+" | "*" | "/" | "%"
```

The pseudocode for expression parsing with precedence climbing is

```python
parse_expr(tokens, min_prec):
  left = parse_factor(tokens)
  next_token = peek(tokens)
  while isBinaryOp(next_token) and precedence(next_token) >= min_prec:
    op = parse_binop(tokens)
    right = parse_expr(tokens, precedence(next_token) + 1)
    left = Binary(op, left, right)
    next_token = peek(tokens)
  return left
```

0 is used as the starting precedence, then precedence is increased as we encounter binary ops. This guarantees that when parsing a binary operator, we only parse a RHS as a binary op if the next operator has higher precedence than the current one.

Otherwise, left associativity kicks in and we parse left-to-right.

## The program stack

The **stack** is a special part of program memory. The register `%rsp` points to the top of the stack, i.e. it's the **stack pointer**. Namely, the last used entry on the stack rather than the first free entry.

The stack grows in towards decreasing memory addresses.

The `push` and `pop` instructions work on this stack. An instruction like `push $3` does a few things. The value is pushed into the next available entry and the stack pointer is adjusted. On a 64-bit system the next stack entry is `RSP-8`. After the operation `%rsp` is the address of the new entry.

`pop %rax` copies the value at the top of the stack into `rax` and decreases the stack by 1 entry (increments the stack pointer by 8 bytes).

`pushw, popw` can work with **words** or 2-byte values.

When a function is called it allocates space on the stack for local variables and temporaries called a **stack frame**. The base of this frame is stored in `%rbp`, called the **base pointer**. All stack entries for the function can be referred to relative to RBP rather than with an explicit address. So a local variable might look like `-4(%rbp)` (remember, the stack grows toward decreasing addresses).

## Registers

Registers have multiple aliases in assembly that specify how many bytes to read. `EAX` is the lower 32 bits of `RAX`, `AX` is 16 bits and `AL, AH` are 8 bits.

## Comparisons and jumps in assembly

x64 assembly contains many conditional instructions like conditionally setting a value or conditionally jumping. These instructions all read their conditions from the RFLAGS register rather than a direct operand. RFLAGS generally isn't set directly but is set as a side effect of other instructions like `add, sub, cmp`.

The **zero flag (ZF)** is set to 1 if the result of the last instruction was 0 and set to 0 if the value was nonzero.

The **sign flag (SF)** is set to 1 if the most significant bit of the last result was 1 and 0 if the most significant bit was 0.

The **overflow flag (OF)** is set to 1 if the last instruction resulted in signed integer overflow and 0 otherwise.

OF and SF are irrelevant for unsigned operations.

The instruction `cmp b, a` computes `a - b` just like `sub b, a` but doesn't store the result. It does set `ZF, SF, OF` so `cmp` can be used to compute comparison operators via the following table:

|                      | ZF | SF | OF |
| -------------------- | -- | -- | -- |
| `a == b`             | 1  | 0  | 0  |
| `a > b`, no overflow | 0  | 0  | 0  |
| `a > b`, overflow    | 0  | 1  | 1  |
| `a < b`, no overflow | 0  | 1  | 0  |
| `a < b`, overflow    | 0  | 0  | 1  |

We can then access these conditions using the conditional set family of functions which each set a byte based on a comparison

| Instruction | Meaning              | Flags after `cmp`       |
| ----------- | -------------------- | ----------------------- |
| `sete`      | Set byte if `a == b` | ZF is set               |
| `setne`     | Set byte if `a != b` | ZF not set              |
| `setg`      | Set byte if `a > b`  | ZF not set and SF == OF |
| `setge`     | Set byte if `a >= b` | SF == OF                |
| `setl`      | Set byte if `a < b`  | SF != OF                |
| `setle`     | Set byte if `a == b` | ZF set of SF != OF      |

**Note** these instructions ony set a single byte in the destination so if you'd like the entire value to be set, zero it out first.

The `jmp` instruction takes a label and does an unconditional jump to that destination. Jump instructions interact with the RIP register (aka instruction pointer) which points to the next instruction to be executed.

Conditional jumps work similarly but only jump if a condition matches after checking RFLAGS. We have `je, jne, jg, jge, jl, jle` just like the set instructions. There are many many more conditional jump instructions.

## Local labels in assembly

Labels can be prefixed with `.L` on Linux and `L` on MacOS to avoid name clashes with user symbols like functions. This fixes collisions because C identifiers don't start with a `.` and on Mac symbols are prefixed with `_`. Such labels are **local labels** and are also omitted from debug symbols to avoid confusing things.


## Current grammar

The grammar currently supported or in progress is chapter 4

```bnf
<program> ::= <function>
<function> ::= "int" <identifier> "(" "void" ")" <block>
<block> ::= "{" { <block-item> } "}"
<block-item> ::= <statement> | <declaration>
<declaration> ::= "int" <identifier> [ "=" <expr> ] ";"
<statement> ::= "return" <expr> ";"
                | <expr> ";"
                | "if" "(" <expr> ")" <statement> ["else" <statement>]
                | <block>
                | ";"
<expr> ::= <factor> | <expr> <binop> <expr> | "?" <expr> ":" <expr>
<factor> ::= <int> | <identifier> | <unop> <expr> | "(" <expr> ")"
<identifier> ::= ? An identifier token ?
<int> ::= ? A constant token ?
<unop> ::= "-" | "~" | "!"
<binop> ::= "-" | "+" | "*" | "/" | "%" | "&&" | "||" | "<" | "<=" | ">" | ">=" | "==" | "!=" | "="
```

## Actions

- [ ] More tests for logical operators, jumps, short-circuiting in ASM
- [ ] Read about twos complement https://www.cs.cornell.edu/~tomf/notes/cps104/ and https://www.nand2tetris.org/course (book icon under Project 2: Boolean arithmetic)

## Notes on the book

Likes:

* The author gives high-level guidance and sometimes pseudo code while leaving much for the reader to learn and decide.
* Book allows for flexibility and acknowledges variations like using different implementation languages and leaving other choices up to the reader.

Suggestions:

* Chapter 2 pp. 36 - "(paraphrasing) The `dst` of a unary operation must be a `Var`". Is there a reason not to encode this in the type system/ASDL definition?
