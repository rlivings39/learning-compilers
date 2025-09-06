//! The notcc AST

use crate::shared_types::Identifier;

// TODO where to put source locations?

#[derive(Clone, PartialEq, Debug)]
/// Unary operator kinds
pub enum UnaryOperator {
  Complement,
  Minus,
  LogicalNot,
}

#[derive(Clone, PartialEq, Debug)]
/// Binary operators
pub enum BinaryOp {
  Plus,
  Divide,
  Multiply,
  Subtract,
  Remainder,
  And,
  Or,
  Less,
  LessEqual,
  Greater,
  GreaterEqual,
  Equal,
  NotEqual,
}

/// Reference type for nested Exprs to break type cycles
pub type ExprRef = Box<Expr>;

#[derive(Clone, PartialEq, Debug)]
// TODO should we put children in an array of Expr for easier handling later?
/// Expression definition including necessary children
pub enum Expr {
  IntConstant(i32),
  // TODO should I use box?
  UnaryExpr(UnaryOperator, ExprRef),
  BinaryExpr(BinaryOp, ExprRef, ExprRef),
  Var(Identifier),
  Assignment(ExprRef, ExprRef),
  Conditional {
    cond: ExprRef,
    true_expr: ExprRef,
    false_expr: ExprRef,
  },
}

impl Expr {
  pub fn kind_to_str(&self) -> &str {
    match self {
      Expr::IntConstant(_) => "Constant",
      Expr::UnaryExpr(_, _) => "UnaryOperator",
      Expr::BinaryExpr(_, _, _) => "BinaryOperator",
      Expr::Var(_) => "Variable",
      Expr::Assignment(_, _) => "Assignment",
      Expr::Conditional {
        cond: _,
        true_expr: _,
        false_expr: _,
      } => "Conditional",
    }
  }
}

#[derive(Clone, PartialEq, Debug)]
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
  Compound(Block),
}

#[derive(PartialEq, Debug, Clone)]
/// BlockItem instances can appear at the top level in a function
pub enum BlockItem {
  Declaration(Identifier, Option<Expr>),
  Stmt(Stmt),
}

#[derive(PartialEq, Debug, Clone)]
/// Blocks encompass 0 or more BlockItems
pub struct Block {
  pub items: Vec<BlockItem>,
}

impl Block {
  pub fn new(items: Vec<BlockItem>) -> Block {
    Block { items }
  }
}
#[derive(PartialEq, Debug)]
/// A function's representation
pub struct Function {
  pub name: Identifier,
  pub body: Block,
}

#[derive(PartialEq, Debug)]
/// A program
pub struct Program {
  pub function: Function,
}

#[cfg(test)]
mod tests {
  use super::*;

  #[allow(unused_imports)]
  use pretty_assertions::{assert_eq, assert_ne, assert_str_eq};

  #[test]
  fn construct_ast() {
    // TODO clone is bad. Maybe?
    // TODO better pattern than if..let?
    // TODO What if the if..let doesn't match?
    let num_c = Expr::IntConstant(12);
    let ret_s = Stmt::Return(num_c.clone());
    let func = Function {
      name: Identifier::new("main"),
      body: Block::new(vec![BlockItem::Stmt(ret_s.clone())]),
    };
    assert_eq!(func.name, "main");
    assert_eq!(func.body.items.len(), 1);
    assert_eq!(func.body.items[0], BlockItem::Stmt(ret_s.clone()));

    let decl = BlockItem::Declaration(Identifier::new("var1"), None);
    let decl_init = BlockItem::Declaration(Identifier::new("var1"), Some(num_c.clone()));
    let func2 = Function {
      name: Identifier::new("main"),
      body: Block::new(vec![BlockItem::Stmt(ret_s.clone()), decl, decl_init]),
    };
    let prog = Program { function: func };
    assert!(!std::ptr::eq(&prog.function, &func2));

    let u_minus = Expr::UnaryExpr(UnaryOperator::Minus, Box::new(num_c.clone()));
    assert!(matches!(&u_minus, Expr::UnaryExpr(UnaryOperator::Minus, expr) if **expr == num_c));

    let comp = Expr::UnaryExpr(UnaryOperator::Complement, Box::new(u_minus.clone()));
    assert!(matches!(&comp, Expr::UnaryExpr(UnaryOperator::Complement, expr) if **expr == u_minus));

    let v = Expr::Var(Identifier::new("var1"));
    let assign = Expr::Assignment(Box::new(v.clone()), Box::new(num_c.clone()));
    let expr_s = Stmt::Expr(assign);
    let null_s = Stmt::Null;
    let if_stmt_no_else = Stmt::If {
      cond: num_c.clone(),
      true_stmt: Box::new(expr_s.clone()),
      false_stmt: None,
    };
    assert!(
      matches!(if_stmt_no_else, Stmt::If{cond, true_stmt, false_stmt} if cond == num_c && *true_stmt == expr_s && false_stmt == None )
    );
    let if_stmt_else = Stmt::If {
      cond: v.clone(),
      true_stmt: Box::new(null_s.clone()),
      false_stmt: Some(Box::new(ret_s.clone())),
    };
    assert!(
      matches!(if_stmt_else, Stmt::If{cond, true_stmt, false_stmt} if cond == v && *true_stmt == null_s && **(false_stmt.as_ref().unwrap()) == ret_s )
    );

    let cond_e = Expr::Conditional {
      cond: Box::new(num_c.clone()),
      true_expr: Box::new(v.clone()),
      false_expr: Box::new(u_minus.clone()),
    };
    assert!(
      matches!(cond_e, Expr::Conditional{cond, true_expr, false_expr} if *cond == num_c && *true_expr == v && *false_expr == u_minus)
    );
  }
}
