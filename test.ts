// === Types & Interfaces ===
interface User {
  name: string;
  age: number;
  role?: "admin" | "viewer";
}

function greet(user: User): string {
  return `Hello, ${user.name} (${user.role ?? "viewer"})`;
}

const alice: User = { name: "Alice", age: 30, role: "admin" };
console.log(greet(alice));

// === Generics ===
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

console.log(first([10, 20, 30]));
console.log(first(["a", "b", "c"]));

// === Enums ===
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

console.log(Direction.Up);

// === Type narrowing ===
function format(val: string | number): string {
  if (typeof val === "number") return val.toFixed(2);
  return val.toUpperCase();
}

console.log(format(3.14159));
console.log(format("hello"));

// === Async / Promise ===
async function fetchUser(id: number): Promise<User> {
  return { name: `User_${id}`, age: 20 + id };
}

fetchUser(1).then((u) => console.log("fetched:", u));
