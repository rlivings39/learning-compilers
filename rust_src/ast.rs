use crate::shared_types::Identifier;

// TODO where to put source locations?

/// Unary operator kinds
pub enum UnaryOperator {
  Complement,
  Minus,
  LogicalNot,
}

/// Relational operators. Split out from binary operators as they need
/// special handling during ASM emission.
pub enum RelOp {
  Less,
  LessEqual,
  Greater,
  GreaterEqual,
  Equal,
  NotEqual,
}

/// Binary operators
pub enum BinaryOp {
  Plus,
  Divide,
  Multiply,
  Subtract,
  Remainder,
  And,
  Or,
}

// TODO should we put children in an array of Expr for easier handling later?
/// Expression definition including necessary children
pub enum Expr {
  IntConstant(i32),
  // TODO should I use box?
  UnaryExpr(UnaryOperator, Box<Expr>),
  RelOpExpr(RelOp, Box<Expr>, Box<Expr>),
  BinaryExpr(BinaryOp, Box<Expr>, Box<Expr>),
  Var(Identifier),
  Assignment(Box<Expr>, Box<Expr>),
  Conditional {
    cond: Box<Expr>,
    true_expr: Box<Expr>,
    false_expr: Box<Expr>,
  },
}

/// Statements
pub enum Stmt {
  Return(Expr),
  Expr(Expr),
  Null,
  If {
    cond: Expr,
    true_stmt: Box<Stmt>,
    false_stmt: Option<Box<Stmt>>,
  },
}

/// BlockItem instances can appear at the top level in a function
pub enum BlockItem {
  Declaration(Identifier, Option<Expr>),
  Stmt(Stmt),
}

/// A function's representation
pub struct Function {
  name: Identifier,
  body: Vec<BlockItem>,
}

/// A program
pub struct Program {
  function: Function,
}
