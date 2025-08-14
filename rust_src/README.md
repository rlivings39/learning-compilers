# notcc - A compiler for a subset of C

This Crate implements a compiler for a subset of C based on the book "Writing a C Compiler" by Nora Sandler.

## Usage

Build the crate and view the CLI help

```bash
cargo run -- -h
```

To use this crate as a library have a look at the function `driver_main` which invokes the entire compiler driver as library interface.

Some other useful commands

```bash
# Run tests
cargo test

# Run tests with coverage after cargo install cargo-llvm-cov
# and optionally generate HTML coverage and open it
cargo llvm-cov --html --open
```
## Full documentation

The full status of the compiler is described in [https://github.com/rlivings39/learning-compilers](https://github.com/rlivings39/learning-compilers)
