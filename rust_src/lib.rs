#![doc = include_str!("README.md")]
pub mod error;

pub use driver::{arg_parser::Cli, driver_main, driver_main_cli};

mod ast;
mod driver;
mod lex;
mod parse;
mod shared_types;
mod source_files;
