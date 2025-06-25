# learning-compilers

This is my attempt at working through [*Writing a C Compiler*](https://norasandler.com/book/) by Nora Sandler.

[NQCC2](https://github.com/nlsandler/nqcc2) is the author's reference implementation.

The [tests](https://github.com/nlsandler/writing-a-c-compiler-tests/) provided with the book can be used along with in-project tests.

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

```
	.text
	.globl	main
	.type	main, @function
main:
	movl	$2, %eax
	ret
```

where lines starting with `.` are assembler directives. `main` is a label for the code following it.

The `movl` instruction does a long move of the value 2 into the register `eax` to match the calling convention. `long` in x64 assembly is 32-bits and quad is 64-bits. `rax` is the 64-bit corresponding register.

When the linker runs, it adds a bit of code `crt0` which calls `main`, gets the return value, and calls the system `exit` forwarding the output of `main`.
