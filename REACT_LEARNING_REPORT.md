# React Todo List — Learning Report

This report walks through every React concept used in the Todo List project, explains *why* each concept exists, and shows exactly where it appears in the code so you can connect theory to practice.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [JSX — HTML Inside JavaScript](#2-jsx--html-inside-javascript)
3. [Components — Building Blocks of React](#3-components--building-blocks-of-react)
4. [Props — Passing Data Downward](#4-props--passing-data-downward)
5. [State & useState — Making Things Interactive](#5-state--usestate--making-things-interactive)
6. [Event Handling — Responding to User Actions](#6-event-handling--responding-to-user-actions)
7. [Controlled Components — React Owns the Input](#7-controlled-components--react-owns-the-input)
8. [Conditional Rendering — Show or Hide Stuff](#8-conditional-rendering--show-or-hide-stuff)
9. [Lists & Keys — Rendering Collections](#9-lists--keys--rendering-collections)
10. [useEffect — Side Effects](#10-useeffect--side-effects)
11. [useRef — Accessing DOM Elements Directly](#11-useref--accessing-dom-elements-directly)
12. [useMemo — Expensive Calculations Done Once](#12-usememo--expensive-calculations-done-once)
13. [useCallback — Stable Function References](#13-usecallback--stable-function-references)
14. [useContext & createContext — Global State Without Prop Drilling](#14-usecontext--createcontext--global-state-without-prop-drilling)
15. [Custom Hooks — Reusable Logic](#15-custom-hooks--reusable-logic)
16. [Lifting State Up — Shared State Lives in the Nearest Common Parent](#16-lifting-state-up--shared-state-lives-in-the-nearest-common-parent)
17. [Immutable State Updates — Never Mutate State Directly](#17-immutable-state-updates--never-mutate-state-directly)
18. [Composition — Nesting Components Together](#18-composition--nesting-components-together)
19. [The children Prop — Wrapping Content](#19-the-children-prop--wrapping-content)
20. [Quick-Reference Cheat Sheet](#20-quick-reference-cheat-sheet)

---

## 1. Project Structure

```
src/
├── index.js                  ← Entry point: mounts React into the DOM
├── App.js                    ← Root component, state logic, context provider
├── App.css                   ← All styles (CSS custom properties for theming)
├── context/
│   └── ThemeContext.js        ← createContext + useContext for light/dark mode
├── hooks/
│   └── useLocalStorage.js    ← Custom hook: syncs state to localStorage
└── components/
    ├── TodoForm.js            ← Input form (controlled component + useRef)
    ├── TodoItem.js            ← Single todo row (props, conditional rendering)
    ├── TodoList.js            ← Renders the list of items (lists & keys)
    ├── TodoFilter.js          ← Filter buttons (all / active / completed)
    └── TodoStats.js           ← Statistics bar (useMemo)
```

Each file is kept small and focused on **one job**. This is the standard React pattern: one component per file.

---

## 2. JSX — HTML Inside JavaScript

**What is it?**
JSX is a syntax extension that lets you write HTML-like code inside JavaScript. Browsers can't read JSX directly — Vite (using Babel under the hood) transforms it into regular `React.createElement()` calls.

**Where you see it — everywhere!** For example in `TodoForm.js`:

```jsx
return (
  <form className="todo-form" onSubmit={handleSubmit}>
    <input
      ref={inputRef}
      type="text"
      className="todo-input"
      placeholder="What needs to be done?"
      value={text}
      onChange={(e) => setText(e.target.value)}
      autoFocus
    />
    <button type="submit" className="todo-add-btn">
      Add
    </button>
  </form>
);
```

**Key JSX rules to remember:**
- Use `className` instead of `class` (because `class` is a reserved keyword in JS).
- Wrap JavaScript expressions in `{}` — e.g. `value={text}`.
- JSX must return a **single root element** (or use `<>...</>` fragments).
- Self-closing tags must end with `/>` — e.g. `<input />`.

---

## 3. Components — Building Blocks of React

**What is it?**
A component is a JavaScript function that returns JSX. It describes a piece of the UI. React apps are trees of components.

**Where you see it:**
Every `.js` file in `src/components/` exports a component. For example, `TodoStats.js`:

```jsx
export default function TodoStats({ todos }) {
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const active = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, active, percent };
  }, [todos]);

  if (stats.total === 0) return null;

  return (
    <div className="todo-stats">
      <span>{stats.active} left</span>
      <span>{stats.completed} done</span>
      <span>{stats.percent}% complete</span>
    </div>
  );
}
```

**Key takeaways:**
- Components are **just functions**. They receive input (props) and return JSX.
- Component names **must start with an uppercase letter** so React knows they're components, not HTML tags.
- Returning `null` means "render nothing" (see the `if (stats.total === 0) return null` above).

---

## 4. Props — Passing Data Downward

**What is it?**
Props (short for "properties") are how a parent component passes data to a child component. Props are **read-only** — a child should never modify its own props.

**Where you see it — `App.js` → `TodoList.js`:**

```jsx
// In App.js (parent)
<TodoList
  todos={filteredTodos}
  onToggle={toggleTodo}
  onDelete={deleteTodo}
  onEdit={editTodo}
/>
```

```jsx
// In TodoList.js (child) — receives props via destructuring
export default function TodoList({ todos, onToggle, onDelete, onEdit }) {
  // ...
}
```

**Key takeaways:**
- Props flow **one direction**: parent → child. This is called **unidirectional data flow**.
- You can pass any JS value as a prop: strings, numbers, arrays, objects, functions, even other components.
- **Destructuring** in the function parameter `({ todos, onToggle })` is the cleanest way to access props.

---

## 5. State & useState — Making Things Interactive

**What is it?**
State is data that belongs to a component and can **change over time**. When state changes, React **re-renders** the component (and its children) to reflect the new data.

`useState` is a React hook that creates a state variable.

**Syntax:**
```jsx
const [value, setValue] = useState(initialValue);
```

**Where you see it — `App.js`:**

```jsx
const [filter, setFilter] = useState('all');
```

- `filter` holds the current value (`'all'`, `'active'`, or `'completed'`).
- `setFilter` is the function you call to update it.
- `'all'` is the initial value (used only on the very first render).

**Where you see it — `TodoForm.js` (input text):**

```jsx
const [text, setText] = useState('');
```

**Where you see it — `TodoItem.js` (edit mode):**

```jsx
const [isEditing, setIsEditing] = useState(false);
const [editText, setEditText] = useState(todo.text);
```

**Functional updater pattern — `App.js`:**

```jsx
setTodos((prev) => [...prev, { id: nextId++, text, completed: false }]);
```

When the new state depends on the previous state, pass a **function** to the setter. This avoids stale-state bugs (especially with `useCallback`).

**Key takeaways:**
- Never modify state directly (`todos.push(...)` is WRONG). Always use the setter function.
- State updates are **asynchronous** — the new value isn't available until the next render.
- Each call to `useState` is independent. You can have as many state variables as you need.

---

## 6. Event Handling — Responding to User Actions

**What is it?**
React uses synthetic events that wrap native browser events. You attach handlers via JSX attributes like `onClick`, `onChange`, `onSubmit`, etc.

**Where you see it — `TodoForm.js` (form submit):**

```jsx
const handleSubmit = (e) => {
  e.preventDefault();     // Prevents the browser from reloading the page
  const trimmed = text.trim();
  if (!trimmed) return;
  onAddTodo(trimmed);
  setText('');
  inputRef.current.focus();
};

// Attached in JSX:
<form className="todo-form" onSubmit={handleSubmit}>
```

**Where you see it — `TodoItem.js` (keyboard events):**

```jsx
const handleKeyDown = (e) => {
  if (e.key === 'Enter') handleSave();
  if (e.key === 'Escape') {
    setEditText(todo.text);
    setIsEditing(false);
  }
};
```

**Key takeaways:**
- Event handler names in JSX are **camelCase**: `onClick`, not `onclick`.
- Handlers receive a **synthetic event object** (`e`) with the same interface as the native event.
- `e.preventDefault()` stops the browser's default behavior (e.g., form submission reloading the page).
- Pass a **function reference**, not a function call: `onClick={handleClick}` NOT `onClick={handleClick()}`.

---

## 7. Controlled Components — React Owns the Input

**What is it?**
A controlled component is a form element whose value is driven by React state. The input doesn't manage its own value — React does.

**Where you see it — `TodoForm.js`:**

```jsx
<input
  value={text}                          // React state drives the value
  onChange={(e) => setText(e.target.value)} // Every keystroke updates state
/>
```

The cycle is: user types → `onChange` fires → `setText` updates state → React re-renders → input shows updated `text`.

**Why bother?**
Because React is the single source of truth, you can easily validate, transform, or restrict input (e.g., trim whitespace, enforce max length).

---

## 8. Conditional Rendering — Show or Hide Stuff

**What is it?**
Rendering different JSX (or nothing at all) based on some condition.

**Technique 1: Early return — `TodoStats.js`:**

```jsx
if (stats.total === 0) return null;   // Render nothing when there are no todos
```

**Technique 2: Ternary operator — `TodoItem.js`:**

```jsx
{isEditing ? (
  <div className="todo-edit-row">
    <input ... />
  </div>
) : (
  <div className="todo-view-row">
    ...
  </div>
)}
```

**Technique 3: Logical AND (`&&`) — `App.js`:**

```jsx
{hasCompleted && (
  <button className="clear-completed-btn" onClick={clearCompleted}>
    Clear Completed
  </button>
)}
```

The button only renders when `hasCompleted` is `true`.

**Key takeaways:**
- `return null` = render nothing.
- Use **ternary** (`? :`) when you have two branches.
- Use **`&&`** when you only have one branch (show or hide).

---

## 9. Lists & Keys — Rendering Collections

**What is it?**
To render a list of items, you `.map()` over an array and return JSX for each element. Every item **must** have a unique `key` prop so React can track which items changed, were added, or removed.

**Where you see it — `TodoList.js`:**

```jsx
<ul className="todo-list">
  {todos.map((todo) => (
    <TodoItem
      key={todo.id}
      todo={todo}
      onToggle={onToggle}
      onDelete={onDelete}
      onEdit={onEdit}
    />
  ))}
</ul>
```

**Where you see it — `TodoFilter.js`:**

```jsx
{FILTERS.map((filter) => (
  <button
    key={filter}
    className={`filter-btn ${currentFilter === filter ? 'active' : ''}`}
    onClick={() => onFilterChange(filter)}
  >
    {filter.charAt(0).toUpperCase() + filter.slice(1)}
  </button>
))}
```

**Key takeaways:**
- `key` must be **unique among siblings** (not globally unique).
- Use a **stable ID** (like `todo.id`), not the array index, whenever possible.
- Using array index as key can cause bugs when items are reordered or deleted because React uses keys to decide which DOM nodes to reuse.

---

## 10. useEffect — Side Effects

**What is it?**
`useEffect` lets you run code **after** the component renders. It's used for side effects: things that reach "outside" the component, like updating the document title, fetching data, or setting up event listeners.

**Syntax:**
```jsx
useEffect(() => {
  // effect runs after render
  return () => { /* optional cleanup */ };
}, [dependencies]);
```

**Where you see it — `App.js` (updating document title):**

```jsx
useEffect(() => {
  document.title = `Todos (${todos.filter(t => !t.completed).length} active)`;
}, [todos]);
```

**Where you see it — `useLocalStorage.js` (syncing to localStorage):**

```jsx
useEffect(() => {
  window.localStorage.setItem(key, JSON.stringify(storedValue));
}, [key, storedValue]);
```

**The dependency array explained:**
- `[todos]` — re-run the effect only when `todos` changes.
- `[]` (empty) — run once after the first render (like `componentDidMount`).
- No array at all — run after every single render (rarely what you want).

**Key takeaways:**
- Effects run **after** the paint, not during rendering.
- Always include all variables from the component scope that the effect reads in the dependency array.
- The cleanup function (if returned) runs before the next effect and on unmount.

---

## 11. useRef — Accessing DOM Elements Directly

**What is it?**
`useRef` creates a mutable reference that persists across renders. It's most commonly used to get a handle on a DOM element.

**Where you see it — `TodoForm.js`:**

```jsx
const inputRef = useRef(null);

// Attached to the DOM element:
<input ref={inputRef} ... />

// Used to focus after adding a todo:
inputRef.current.focus();
```

**Key takeaways:**
- `useRef` returns an object `{ current: value }`.
- Changing `.current` does **not** trigger a re-render (unlike state).
- Common uses: focusing inputs, measuring element size, storing previous values, holding timers.

---

## 12. useMemo — Expensive Calculations Done Once

**What is it?**
`useMemo` caches (memoizes) the result of a computation and only recalculates when its dependencies change. It prevents unnecessary recalculations on every render.

**Where you see it — `TodoStats.js`:**

```jsx
const stats = useMemo(() => {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const active = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, active, percent };
}, [todos]);
```

**Where you see it — `App.js` (filtered list):**

```jsx
const filteredTodos = useMemo(() => {
  switch (filter) {
    case 'active':
      return todos.filter((t) => !t.completed);
    case 'completed':
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
}, [todos, filter]);
```

**Key takeaways:**
- The function inside `useMemo` runs during rendering (not after, like `useEffect`).
- It only recalculates when dependencies change.
- Don't overuse it — it adds complexity. Use it when the calculation is actually expensive or when you need a stable reference for child component optimization.

---

## 13. useCallback — Stable Function References

**What is it?**
`useCallback` returns a memoized version of a callback function. The function reference stays the same across renders unless its dependencies change.

**Where you see it — `App.js`:**

```jsx
const addTodo = useCallback((text) => {
  setTodos((prev) => [...prev, { id: nextId++, text, completed: false }]);
}, [setTodos]);

const toggleTodo = useCallback((id) => {
  setTodos((prev) =>
    prev.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  );
}, [setTodos]);

const deleteTodo = useCallback((id) => {
  setTodos((prev) => prev.filter((todo) => todo.id !== id));
}, [setTodos]);
```

**Why is this useful?**
Without `useCallback`, each render creates a **new function object**. If you pass that function as a prop to a child component, the child sees "new props" and re-renders unnecessarily. `useCallback` keeps the reference stable so child components can skip re-renders.

**Key takeaways:**
- `useCallback(fn, deps)` is essentially `useMemo(() => fn, deps)`.
- Pair with `React.memo()` on child components for maximum benefit.
- Like `useMemo`, don't use it everywhere — only where unnecessary re-renders are a real problem.

---

## 14. useContext & createContext — Global State Without Prop Drilling

**What is it?**
Context provides a way to pass data through the component tree without manually passing props at every level. It solves the "prop drilling" problem.

**Step 1: Create the context — `ThemeContext.js`:**

```jsx
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();
```

**Step 2: Create a Provider component that holds the state:**

```jsx
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Step 3: Create a custom hook for easy consumption:**

```jsx
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

**Step 4: Wrap your app — `App.js`:**

```jsx
export default function App() {
  return (
    <ThemeProvider>
      <TodoApp />
    </ThemeProvider>
  );
}
```

**Step 5: Consume anywhere deep in the tree — `App.js` (TodoApp):**

```jsx
function TodoApp() {
  const { theme, toggleTheme } = useTheme();
  // Now any component inside ThemeProvider can access theme
}
```

**Key takeaways:**
- `createContext()` creates the context object.
- `<Context.Provider value={...}>` makes the value available to all descendants.
- `useContext(Context)` reads the nearest Provider's value.
- Context is great for truly global data (theme, auth, locale). Don't use it for everything — props are simpler for direct parent-child communication.

---

## 15. Custom Hooks — Reusable Logic

**What is it?**
A custom hook is a function whose name starts with `use` that calls other hooks. It lets you extract and reuse stateful logic across multiple components.

**Where you see it — `useLocalStorage.js`:**

```jsx
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(storedValue));
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
```

**How it's used — `App.js`:**

```jsx
const [todos, setTodos] = useLocalStorage('react-todos', []);
```

This works exactly like `useState`, but the value automatically persists in the browser's localStorage. If you refresh the page, your todos are still there.

**Where you see it — `useTheme` in `ThemeContext.js`:**

```jsx
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

**Key takeaways:**
- Custom hook names **must** start with `use` — this is how React knows to apply the Rules of Hooks.
- Custom hooks can use any built-in hook (`useState`, `useEffect`, `useContext`, etc.).
- They let you share logic, not UI. The component still controls what gets rendered.

---

## 16. Lifting State Up — Shared State Lives in the Nearest Common Parent

**What is it?**
When multiple components need to share and modify the same data, you "lift" the state up to their nearest common ancestor and pass it down via props.

**Where you see it:**
The `todos` array lives in `App.js` (the `TodoApp` component). It is passed down to:
- `TodoStats` — to display statistics
- `TodoFilter` — uses `filter` state, also in App
- `TodoList` → `TodoItem` — to display and modify each todo

```
       TodoApp (owns todos state)
      /    |     \        \
TodoForm  TodoStats  TodoFilter  TodoList
                                    |
                                 TodoItem
```

`TodoItem` doesn't own the `onToggle` or `onDelete` logic — it calls functions passed down from `TodoApp`. This keeps the single source of truth in one place.

---

## 17. Immutable State Updates — Never Mutate State Directly

**What is it?**
In React, you should treat state as **immutable**. Instead of modifying existing objects/arrays, you create new ones. This is critical because React uses reference comparison to detect changes.

**Where you see it — `App.js` (adding a todo):**

```jsx
setTodos((prev) => [...prev, { id: nextId++, text, completed: false }]);
```
`...prev` spreads the old array into a new one, then the new todo is appended.

**Where you see it — `App.js` (toggling a todo):**

```jsx
setTodos((prev) =>
  prev.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  )
);
```
`.map()` creates a new array. For the matching todo, `{ ...todo, completed: !todo.completed }` creates a new object with the flipped value. All other todos are untouched.

**Where you see it — `App.js` (deleting a todo):**

```jsx
setTodos((prev) => prev.filter((todo) => todo.id !== id));
```
`.filter()` returns a new array without the deleted item.

**Key takeaways:**
- **NEVER** do `todos.push(newTodo)` or `todo.completed = true` directly on state.
- Use spread (`...`), `.map()`, `.filter()`, and `.slice()` to create new arrays/objects.
- This ensures React detects the change and re-renders correctly.

---

## 18. Composition — Nesting Components Together

**What is it?**
React encourages building UIs by composing small, focused components together rather than using inheritance.

**Where you see it — `App.js`:**

```jsx
<div className="container">
  <header className="app-header">
    <h1>Todo List</h1>
    <button className="theme-toggle" onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  </header>

  <TodoForm onAddTodo={addTodo} />
  <TodoStats todos={todos} />
  <TodoFilter currentFilter={filter} onFilterChange={setFilter} />
  <TodoList todos={filteredTodos} onToggle={toggleTodo} onDelete={deleteTodo} onEdit={editTodo} />
</div>
```

Each component handles one concern. Together they compose the full app.

---

## 19. The `children` Prop — Wrapping Content

**What is it?**
When you nest JSX between a component's opening and closing tags, React passes that content as a special prop called `children`.

**Where you see it — `ThemeContext.js`:**

```jsx
export function ThemeProvider({ children }) {
  // ...
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Used in `App.js`:**

```jsx
<ThemeProvider>
  <TodoApp />       {/* ← This is `children` */}
</ThemeProvider>
```

`ThemeProvider` doesn't know or care what `children` is. It just wraps it with the context provider. This makes it a **wrapper/container component**.

---

## 20. Quick-Reference Cheat Sheet

| Concept               | Hook/API                   | File Where Used                |
|----------------------|---------------------------|-------------------------------|
| State                | `useState`                 | App.js, TodoForm.js, TodoItem.js |
| Side effects         | `useEffect`                | App.js, useLocalStorage.js    |
| DOM access           | `useRef`                   | TodoForm.js                   |
| Memoize values       | `useMemo`                  | App.js, TodoStats.js          |
| Memoize functions    | `useCallback`              | App.js                        |
| Context (create)     | `createContext`             | ThemeContext.js                |
| Context (consume)    | `useContext`                | ThemeContext.js                |
| Custom hook          | `useLocalStorage`          | useLocalStorage.js → App.js   |
| Props                | function params            | Every component               |
| Children prop        | `{ children }`             | ThemeProvider                  |
| Conditional render   | `&&`, `? :`, `return null` | App.js, TodoItem.js, TodoStats.js |
| Lists & keys         | `.map()` + `key`           | TodoList.js, TodoFilter.js    |
| Controlled inputs    | `value` + `onChange`       | TodoForm.js, TodoItem.js      |
| Immutable updates    | spread, map, filter        | App.js                        |
| Event handling       | `onSubmit`, `onClick`, etc | TodoForm.js, TodoItem.js      |
| Lifting state up     | State in common parent     | App.js (owns all todo state)  |
| Composition          | Nesting components         | App.js                        |

---

## How to Run

```bash
npm start
```

This launches Vite's dev server at `http://localhost:3000`. Open it in your browser and start adding todos!

**Features to try:**
- Add, edit (double-click text or click ✎), and delete todos
- Mark todos as complete with the checkbox
- Filter by All / Active / Completed
- Toggle light/dark theme with the moon/sun button
- Refresh the page — your todos persist via localStorage
- Check the browser tab title — it updates with the active count

---

*Happy learning! Once you're comfortable with these concepts, the next steps would be exploring React Router (navigation), data fetching patterns, and state management libraries like Zustand or Redux.*
