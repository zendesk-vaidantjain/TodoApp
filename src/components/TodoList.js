import TodoItem from './TodoItem';

export default function TodoList({ todos, onToggle, onDelete, onEdit, onMoveToNextDay }) {
  if (todos.length === 0) {
    return <p className="empty-message">No todos to show. Add one above!</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onMoveToNextDay={onMoveToNextDay}
        />
      ))}
    </ul>
  );
}
