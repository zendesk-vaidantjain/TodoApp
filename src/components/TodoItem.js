import { useState } from 'react';

export default function TodoItem({ todo, onToggle, onDelete, onEdit, onMoveToNextDay }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.title);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed) {
      onEdit(todo.id, trimmed);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditText(todo.title);
      setIsEditing(false);
    }
  };

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      {isEditing ? (
        <div className="todo-edit-row">
          <input
            type="text"
            className="todo-edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      ) : (
        <div className="todo-view-row">
          <input
            type="checkbox"
            className="todo-checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo.id)}
          />
          <span
            className="todo-text"
            onDoubleClick={() => setIsEditing(true)}
          >
            {todo.title}
          </span>
          <div className="todo-actions">
            {!todo.completed && onMoveToNextDay && (
              <button
                className="todo-move-btn"
                onClick={() => onMoveToNextDay(todo.id)}
                title="Move to next business day"
              >
                ➡️
              </button>
            )}
            <button
              className="todo-edit-btn"
              onClick={() => setIsEditing(true)}
            >
              ✎
            </button>
            <button
              className="todo-delete-btn"
              onClick={() => onDelete(todo.id)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
