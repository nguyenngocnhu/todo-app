import api from './api'

export default {
  async getTodos() {
    const res = await api.get('/todo')
    return res.data
  },
  async getTodosPage({ limit = 50, page = null, afterOrder = null, afterId = null } = {}) {
    const params = {};
    if (limit) params.limit = limit;
    if (page !== null && page !== undefined) params.page = page;
    if (afterOrder !== null && afterOrder !== undefined) params.afterOrder = afterOrder;
    if (afterId !== null && afterId !== undefined) params.afterId = afterId;
    const res = await api.get('/todo/page', { params });
    return res.data; // { items, page, totalPages }
  },
  async createTodo(todo) {
    const res = await api.post('/todo', todo)
    return res.data
  },
  async updateTodo(todo) {
    // backend expects id in path
    const res = await api.put(`/todo/${todo.id}`, todo)
    return res.data
  },
  async deleteTodo(id) {
    const res = await api.delete(`/todo/${id}`)
    return res.data
  }
  ,
  async reorder(updates) {
    // updates: [{ id, order }]
    const res = await api.patch('/todo/reorder', updates)
    return res.data
  }
}
