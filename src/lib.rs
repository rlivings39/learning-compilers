#![doc = include_str!("README.md")]
pub mod error;

pub use driver::{arg_parser::Cli, driver_main, driver_main_cli};

mod asm;
mod ast;
mod ast_to_tacky;
mod driver;
mod emit_asm;
mod lex;
mod parse;
mod pretty_print;
mod pretty_print_tacky;
mod semantics;
mod shared_types;
mod source_files;
mod tacky;
mod tacky_to_asm;
#[cfg(test)]
mod test_tools;
