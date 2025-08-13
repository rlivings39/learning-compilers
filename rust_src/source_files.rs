//! Source file and location specification for notcc

type LineMap = Vec<[usize; 2]>;
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

  /// Construct a new SourceFile given its code and a path
  pub fn new(code: String, path: String) -> SourceFile {
    let mut line_map: LineMap = Vec::new();
    let mut prev_idx: usize = 0;
    for (idx, c) in code.chars().enumerate() {
      if c == '\n' {
        line_map.push([prev_idx, idx]);
        prev_idx = idx + 1;
      }
    }
    return SourceFile {
      code,
      line_map,
      path,
    };
  }

  /// Convert a character offset to a Location with line, column values
  pub fn char_to_location(&self, idx: usize) -> Location {
    let mut row: usize = 0;
    let mut col: usize = 0;
    for (row_idx, bounds) in self.line_map.iter().enumerate() {
      if idx >= bounds[0] && idx <= bounds[1] {
        row = row_idx;
        col = idx - bounds[0];
      }
    }
    Location {
      line: row,
      column: col,
      file_path: self.path.clone(),
    }
  }
}

pub struct Location {
  pub line: usize,
  pub column: usize,
  pub file_path: String,
}

#[cfg(test)]
mod tests {
  use super::*;
  #[test]
  fn make_source_file() {
    let code: &'static str = "int main(void) {
  return 2;
}";
    let path = "/foo/bar/baz.c";
    let source = SourceFile::new(code.to_string(), path.to_string());
    assert_eq!(source.code(), code);
    let mut loc = source.char_to_location(0);
    assert_eq!(loc.column, 0);
    assert_eq!(loc.line, 0);
    assert_eq!(loc.file_path, path);
    loc = source.char_to_location(6);
    assert_eq!(loc.column, 6);
    assert_eq!(loc.line, 0);
    assert_eq!(loc.file_path, path);
    loc = source.char_to_location(17);
    assert_eq!(loc.column, 0);
    assert_eq!(loc.line, 1);
    assert_eq!(loc.file_path, path);
    loc = source.char_to_location(28);
    assert_eq!(loc.column, 11);
    assert_eq!(loc.line, 1);
    assert_eq!(loc.file_path, path);
  }
}
