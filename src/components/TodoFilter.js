const FILTERS = ['all', 'active', 'completed'];

export default function TodoFilter({ currentFilter, onFilterChange }) {
  return (
    <div className="todo-filter">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          className={`filter-btn ${currentFilter === filter ? 'active' : ''}`}
          onClick={() => onFilterChange(filter)}
        >
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </button>
      ))}
    </div>
  );
}
