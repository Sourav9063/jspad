// === Primitives ===
console.log("string");
console.log(42);
console.log(3.14);
console.log(true);
console.log(false);
console.log(null);
console.log(undefined);
console.log(NaN);
console.log(Infinity);
console.log(-Infinity);

// === Multiple args ===
console.log("a", "b", "c");
console.log(1, 2, 3);
console.log("mixed", 42, true, null);

// === Objects & Arrays ===
console.log({ name: "Alice", age: 30 });
console.log([1, 2, 3]);
console.log([{ id: 1 }, { id: 2 }]);
console.log({ nested: { deep: { value: 99 } } });
console.log({ arr: [1, [2, [3]]] });

// === Warnings ===
console.warn("simple warning");
console.warn("deprecated API usage");
console.warn("something might be wrong", { code: 42 });

// === Errors ===
console.error("simple error");
console.error("failed to fetch", { status: 404 });
console.error(new Error("something broke"));
console.error("multiple", "error", "args");

// === Long output ===
console.log("a".repeat(200));
console.log(Array.from({ length: 20 }, (_, i) => i));

// === Async (fetch simulation) ===
Promise.resolve({ user: "Bob", score: 100 }).then((val) =>
  console.log("async resolved:", val)
);

Promise.reject(new Error("async failure")).catch((err) =>
  console.error("async rejected:", err)
);

setTimeout(() => console.log("setTimeout fired after 500ms"), 500);
setTimeout(() => console.warn("setTimeout warning after 1s"), 1000);
setTimeout(() => console.error("setTimeout error after 1.5s"), 1500);

// === Thrown error (caught by editor) ===
// Uncomment to test runtime error display:
// throw new Error("uncaught runtime error");
