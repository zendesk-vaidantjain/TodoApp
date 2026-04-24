import { useState, useEffect, useMemo } from 'react';
import { tasksApi } from '../services/api';

export default function Calendar({ selectedDate, onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [datesWithTasks, setDatesWithTasks] = useState({});

  useEffect(() => {
    tasksApi.datesWithTasks(currentMonth.year, currentMonth.month + 1)
      .then((res) => setDatesWithTasks(res.data.dates || {}))
      .catch(() => setDatesWithTasks({}));
  }, [currentMonth]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days = [];

    // Previous month padding
    for (let i = 0; i < startPad; i++) {
      days.push({ day: null, date: null });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, date: dateStr });
    }

    return days;
  }, [currentMonth]);

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const goToToday = () => {
    const d = new Date();
    setCurrentMonth({ year: d.getFullYear(), month: d.getMonth() });
    onDateSelect(today);
  };

  const isWeekend = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return d.getDay() === 0 || d.getDay() === 6;
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
        <span className="calendar-month-name">{monthName}</span>
        <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
      </div>

      <button className="calendar-today-btn" onClick={goToToday}>Today</button>

      <div className="calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarDays.map((item, idx) => {
          if (!item.date) {
            return <div key={`pad-${idx}`} className="calendar-day empty" />;
          }

          const isSelected = item.date === selectedDate;
          const isToday = item.date === today;
          const hasTasks = datesWithTasks[item.date] > 0;
          const weekend = isWeekend(item.date);

          return (
            <button
              key={item.date}
              className={[
                'calendar-day',
                isSelected && 'selected',
                isToday && 'today',
                hasTasks && 'has-tasks',
                weekend && 'weekend',
              ].filter(Boolean).join(' ')}
              onClick={() => onDateSelect(item.date)}
            >
              {item.day}
              {hasTasks && <span className="task-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
