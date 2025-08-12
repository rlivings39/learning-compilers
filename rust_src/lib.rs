#![doc = include_str!("README.md")]
mod driver;
pub mod error;

pub use driver::{arg_parser::Cli, driver_main, driver_main_cli};
