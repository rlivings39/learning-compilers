use crate::source_files::SourceFile;

pub type Error = String;

pub fn fail(msg: &str) -> Result<(), Error> {
  return Err(msg.to_string());
}
