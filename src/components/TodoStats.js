import { useMemo } from 'react';

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
