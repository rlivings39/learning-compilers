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

### `Box<T>`

`Box<T>` is used to store data on the heap rather than on the stack. It has no performance overhead and is often used with:

* Types whose sizes are only known at runtime in a context where a size must be known at compile-time. E.g. recursive types
* Transferring large amounts of data from the stack to the heap
* Owning a value that you only care implements a particular trait rather than being of a specific type

A box's underlying data can generally be accessed just like data on the stack.

`Box` implements `Deref` so that you can refer to it just like a reference and `Drop` so it cleans up its data when it goes out of scope.

### `Deref`

The ability to dereference something using `*x` is provided by implementing the `Deref` trait. When Rust sees `*x` on a type implementing `Deref` it changes the code to `*(x.deref())` so that the bare `*` is called on the output of the `deref` method.

Rust also has deref coercion which allows passing `&T` to a function or method expecting `&R` where `T::deref() -> &R`. This is why `&String` can be passed to a function taking `&str`. `Deref::deref()` is applied as many times as needed to match the source and destination types.

`DerefMut` can be used to implement the same behavior on mutable references. Coercion from immutable to immutable and mutable to mutable are both straightforward. Rust will also coerce mutable to immutable as that preserves safety.
