//! Source file and location specification for notcc

use crate::error::Error;
type LineMap = Vec<[usize; 2]>;

#[allow(dead_code)]
#[derive(Clone, PartialEq, Debug)]
/// Source locations
pub struct SourceLocation {
  pub start: usize,
  pub end: usize,
  pub path: String,
}

/// The notcc representation of a SourceFile
pub struct SourceFile {
  code: String,
  line_map: LineMap,
  pub path: String,
}

impl SourceFile {
  /// Return a reference to the code in this SourceFile
  pub fn code(&self) -> &String {
    &self.code
  }

  #[allow(dead_code)]
  /// Create a source location for this file with the given start and end
  pub fn source_location(&self, start: usize, end: usize) -> SourceLocation {
    SourceLocation {
      start,
      end,
      path: self.path.clone(),
    }
  }

  /// Construct a new SourceFile given its code and a path
  pub fn new(code: String, path: String) -> SourceFile {
    let mut line_map: LineMap = Vec::new();
    let mut prev_idx: usize = 0;
    for (idx, c) in code.chars().enumerate() {
      if c == '\n' {
        line_map.push([prev_idx, idx]);
        prev_idx = idx + 1;
      } else if idx == code.len() - 1 {
        line_map.push([prev_idx, idx + 1]);
      }
    }
    return SourceFile {
      code,
      line_map,
      path,
    };
  }

  pub fn err_in_range(&self, start: usize, end: usize, msg: &str) -> Error {
    let (line, loc) = self.containing_line_and_loc(start);
    let message = format!(
      "{msg}\n\nin {}:{}:{}\n\n{line}\n{}{}",
      loc.file_path,
      loc.line + 1,
      loc.column + 1,
      " ".repeat(loc.column),
      "^".repeat(end - start)
    );
    message
  }

  pub fn err_at_index(&self, idx: usize, msg: &str) -> Error {
    self.err_in_range(idx, idx + 1, msg)
  }

  fn containing_line_and_loc(&self, idx: usize) -> (&str, LineColLocation) {
    let loc = self.char_to_line_col(idx);
    let [start, end] = self.line_map[loc.line];
    (&self.code[start..end], loc)
  }

  /// Convert a character offset to a Location with line, column values
  fn char_to_line_col(&self, idx: usize) -> LineColLocation {
    let mut row: usize = 0;
    let mut col: usize = 0;
    for (row_idx, bounds) in self.line_map.iter().enumerate() {
      if idx >= bounds[0] && idx <= bounds[1] {
        row = row_idx;
        col = idx - bounds[0];
      }
    }
    LineColLocation {
      line: row,
      column: col,
      file_path: self.path.clone(),
    }
  }
}

pub struct LineColLocation {
  pub line: usize,
  pub column: usize,
  pub file_path: String,
}

#[cfg(test)]
mod tests {
  use super::*;
  #[allow(unused_imports)]
  use pretty_assertions::assert_eq;
  #[test]
  fn make_source_file() {
    let code: &'static str = "int main(void) {
  return 2;
}";
    let path = "/foo/bar/baz.c";
    let source = SourceFile::new(code.to_string(), path.to_string());
    assert_eq!(source.code(), code);
    let mut loc = source.char_to_line_col(0);
    assert_eq!(loc.column, 0);
    assert_eq!(loc.line, 0);
    assert_eq!(loc.file_path, path);
    loc = source.char_to_line_col(6);
    assert_eq!(loc.column, 6);
    assert_eq!(loc.line, 0);
    assert_eq!(loc.file_path, path);
    loc = source.char_to_line_col(17);
    assert_eq!(loc.column, 0);
    assert_eq!(loc.line, 1);
    assert_eq!(loc.file_path, path);
    loc = source.char_to_line_col(28);
    assert_eq!(loc.column, 11);
    assert_eq!(loc.line, 1);
    assert_eq!(loc.file_path, path);
    loc = source.char_to_line_col(29);
    assert_eq!((loc.line, loc.column), (2, 0));
    assert_eq!(loc.file_path, path);
  }

  #[test]
  fn test_containing_line_and_loc() {
    let code: &'static str = "int main(void) {
  return 2;
}";
    let path = "/foo/bar/baz.c";
    let source = SourceFile::new(code.to_string(), path.to_string());
    let (line, loc) = source.containing_line_and_loc(17);
    assert_eq!(line, "  return 2;");
    assert_eq!(loc.column, 0);
    assert_eq!(loc.line, 1);
    let source = SourceFile::new("$".to_string(), path.to_string());
    let (line, loc) = source.containing_line_and_loc(0);
    assert_eq!(line, "$");
    assert_eq!(loc.column, 0);
    assert_eq!(loc.line, 0);
  }

  #[test]
  fn test_err_at_index() {
    let code: &'static str = "int main(void) {
  return 2;
}";
    let path = "~/foo.c";
    let source = SourceFile::new(code.to_string(), path.to_string());
    let msg = source.err_at_index(19, "Something bad");
    let expected = "Something bad

in ~/foo.c:2:3

  return 2;
  ^";
    if msg != expected {
      eprintln!("Unexpected message\n{msg}");
      assert!(false)
    }
  }

  #[test]
  fn test_err_at_range() {
    let code: &'static str = "int main(void) {
  return 2;
}";
    let path = "~/foo.c";
    let source = SourceFile::new(code.to_string(), path.to_string());
    let msg = source.err_in_range(19, 25, "Something bad");
    let expected = "Something bad

in ~/foo.c:2:3

  return 2;
  ^^^^^^";
    assert_eq!(msg, expected);
  }
}
