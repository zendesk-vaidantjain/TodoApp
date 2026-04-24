import axios from 'axios';

const API_URL = 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  signup: (data) => api.post('/signup', data),
  login: (data) => api.post('/login', data),
  me: () => api.get('/me'),
};

// Tasks API
export const tasksApi = {
  getTasks: (date) => api.get('/tasks', { params: { date } }),
  createTask: (title, scheduled_date) => api.post('/tasks', { title, scheduled_date }),
  updateTask: (id, data) => api.patch(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  moveToNextDay: (id) => api.patch(`/tasks/${id}/move_to_next_day`),
  datesWithTasks: (year, month) => api.get('/tasks/dates_with_tasks', { params: { year, month } }),
};

export default api;
