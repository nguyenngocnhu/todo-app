import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000/api/todo',
  headers: { 'Content-Type': 'application/json' }
})

export default {
  async getTodos() {
    const res = await api.get('/')
    return res.data
  },
  async createTodo(todo) {
    const res = await api.post('/', todo)
    return res.data
  },
  async updateTodo(todo) {
    // backend expects id in path
    const res = await api.put(`/${todo.id}`, todo)
    return res.data
  },
  async deleteTodo(id) {
    const res = await api.delete(`/${id}`)
    return res.data
  }
}
