#![doc = include_str!("README.md")]
pub mod error;

pub use driver::{arg_parser::Cli, driver_main, driver_main_cli};

mod ast;
mod ast_to_tacky;
mod driver;
mod lex;
mod parse;
mod pretty_print;
mod semantics;
mod shared_types;
mod source_files;
mod tacky;
#[cfg(test)]
mod test_tools;
