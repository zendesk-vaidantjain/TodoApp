import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { tasksApi } from '../services/api';
import TodoForm from '../components/TodoForm';
import TodoList from '../components/TodoList';
import TodoFilter from '../components/TodoFilter';
import TodoStats from '../components/TodoStats';
import Calendar from '../components/Calendar';

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TodoApp() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchTasks = useCallback(async (date) => {
    setLoading(true);
    try {
      const res = await tasksApi.getTasks(date);
      setTodos(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchTasks(selectedDate);
    }
  }, [selectedDate, fetchTasks]);

  const addTodo = useCallback(async (text) => {
    try {
      const res = await tasksApi.createTask(text, selectedDate);
      setTodos((prev) => [...prev, res.data.task]);
    } catch (err) {
      console.error('Failed to add task', err);
    }
  }, [selectedDate]);

  const toggleTodo = useCallback(async (id) => {
    const task = todos.find((t) => t.id === id);
    if (!task) return;
    try {
      const res = await tasksApi.updateTask(id, { completed: !task.completed });
      setTodos((prev) => prev.map((t) => (t.id === id ? res.data.task : t)));
    } catch (err) {
      console.error('Failed to toggle task', err);
    }
  }, [todos]);

  const deleteTodo = useCallback(async (id) => {
    try {
      await tasksApi.deleteTask(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  }, []);

  const editTodo = useCallback(async (id, newText) => {
    try {
      const res = await tasksApi.updateTask(id, { title: newText });
      setTodos((prev) => prev.map((t) => (t.id === id ? res.data.task : t)));
    } catch (err) {
      console.error('Failed to edit task', err);
    }
  }, []);

  const moveToNextDay = useCallback(async (id) => {
    try {
      const res = await tasksApi.moveToNextDay(id);
      // Remove from current view since it moved to a different date
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to move task', err);
    }
  }, []);

  const clearCompleted = useCallback(async () => {
    const completedTasks = todos.filter((t) => t.completed);
    try {
      await Promise.all(completedTasks.map((t) => tasksApi.deleteTask(t.id)));
      setTodos((prev) => prev.filter((t) => !t.completed));
    } catch (err) {
      console.error('Failed to clear completed', err);
    }
  }, [todos]);

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

  const hasCompleted = todos.some((t) => t.completed);

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isToday = selectedDate === getToday();

  return (
    <div className={`app ${theme}`}>
      <div className="container">
        <header className="app-header">
          <h1>Todo List</h1>
          <div className="header-actions">
            <span className="user-greeting">Hi, {user?.name}</span>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <div className="date-selector">
          <button className="calendar-toggle-btn" onClick={() => setCalendarOpen(!calendarOpen)}>
            📅 {formatDisplayDate(selectedDate)}
            {isToday && <span className="today-badge">Today</span>}
          </button>
        </div>

        {calendarOpen && (
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setCalendarOpen(false);
            }}
          />
        )}

        <TodoForm onAddTodo={addTodo} />
        <TodoStats todos={todos} />
        <TodoFilter currentFilter={filter} onFilterChange={setFilter} />

        {loading ? (
          <div className="loading-tasks">
            <div className="loading-spinner" />
            <p>Loading tasks...</p>
          </div>
        ) : (
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onEdit={editTodo}
            onMoveToNextDay={moveToNextDay}
          />
        )}

        {hasCompleted && (
          <button className="clear-completed-btn" onClick={clearCompleted}>
            Clear Completed
          </button>
        )}
      </div>
    </div>
  );
}
