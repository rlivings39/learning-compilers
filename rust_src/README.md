# notcc - A compiler for a subset of C

This Crate implements a compiler for a subset of C based on the book "Writing a C Compiler" by Nora Sandler.

## Usage

Build the crate and view the CLI help

```bash
cargo run -- -h
```

To use this crate as a library have a look at the function `driver_main` which invokes the entire compiler driver as library interface.

## Full documentation

The full status of the compiler is described in [https://github.com/rlivings39/learning-compilers](https://github.com/rlivings39/learning-compilers)

## Smart pointers

Smart pointers are structs that own memory and provide functionality via the `Drop` and `Deref` traits. There are reference counted smart pointers too.

**Note** `Drop::drop()` can't be called directly as doing so would result in a double free. Instead call `std::mem::drop` aka `drop(obj)` instead to free resources early.

`String` and `Vec` can be considered smart pointers.

Three major smart pointers in Rust are

* `Box<T>` for allocating values on the heap
* `Rc<T>` for reference counted multiple ownership
* `Ref<T>, RefMut<T>` accessed via `RefCell<T>` that enforces borrowing rules at runtime instead of compile time

**Note** `Rc<T>` and `RefCell<T>` only work in single-threaded contexts.

### `Box<T>` and `Rc<T>`

`Box<T>` is used to store data on the heap rather than on the stack. It has no performance overhead and is often used with:

* Types whose sizes are only known at runtime in a context where a size must be known at compile-time. E.g. recursive types
* Transferring large amounts of data from the stack to the heap
* Owning a value that you only care implements a particular trait rather than being of a specific type

A box's underlying data can generally be accessed just like data on the stack.

`Box` implements `Deref` so that you can refer to it just like a reference and `Drop` so it cleans up its data when it goes out of scope.

`Rc<T>` works similarly to `Box<T>` but implements reference counting. If you have `let x: Rc<T> = Rc::new(...)` then you can call `Rc::clone(&x)` to increment the reference count to `x`. This is preferable to calling `x.clone()` because the latter is often used for deep copies. `Rc::clone` is cheap and so good to visually distinguish.

`Rc::strong_count()` returns the number of strong references. `Rc::weak_count()` refers to the weak references.

### `RefCell<T>`
`RefCell<T>` is single ownership like `Box<T>` but does its checking at runtime

* `Box<T>` allows immutable and mutable borrows checked at compile-time
* `Rc<T>` enables multiple owners. `Box<T>, RefCell<T>` have single owners
* `RefCell<T>` allows immutable or mutable borrows checked at runtime even when the `RefCell<T>` is immutable

The pattern of mutating a value inside of an immutable value is called the **interior mutability** pattern.

This could be useful for cases when you might use `mutable` in C++. For example having a mutable field inside of an immutable reference to store messages in a mock message sender object.

When you have a `RefCell<T>` you can call `borrow()` or `borrow_mut()` to borrow a reference to the underlying object. The former returns `Ref<T>` the latter `RefMut<T>` which both implement `Deref`.

These borrow methods keep track of how many of each type of reference is live and panic if the ownership rules are violated at runtime.

You can hold `Rc<RefCell<T>>` if you'd like to have multiple owners of data that you can mutate.

### `Weak<T>`

`Rc::clone()` produces a strong reference and increments the reference count. Using `Rc::downgrade(&x)` returns a `let w = Weak<T>` that holds a weak reference. When you'd like to get a strong reference for usage later on call `w.upgrade()` to get a `Option<Rc<T>>` that is none if the reference has been deleted and has the value in the some variant.

### `Deref`

The ability to dereference something using `*x` is provided by implementing the `Deref` trait. When Rust sees `*x` on a type implementing `Deref` it changes the code to `*(x.deref())` so that the bare `*` is called on the output of the `deref` method.

Rust also has deref coercion which allows passing `&T` to a function or method expecting `&R` where `T::deref() -> &R`. This is why `&String` can be passed to a function taking `&str`. `Deref::deref()` is applied as many times as needed to match the source and destination types.

`DerefMut` can be used to implement the same behavior on mutable references. Coercion from immutable to immutable and mutable to mutable are both straightforward. Rust will also coerce mutable to immutable as that preserves safety.
