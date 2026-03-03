'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, Trash2 } from 'lucide-react'

interface Todo {
  id: string
  task: string
  completed: boolean
  createdAt: string
}

export function TodoList() {
  const { user } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadTasks()
    }
  }, [user])

  const loadTasks = async () => {
    if (!user) return

    try {
      const q = query(collection(db, "todos"), where("uid", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const tasks: Todo[] = []
      
      querySnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        } as Todo)
      })
      
      setTodos(tasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const addTask = async () => {
    if (!newTask.trim() || !user) return

    setLoading(true)
    try {
      await addDoc(collection(db, "todos"), {
        uid: user.uid,
        task: newTask.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      })
      
      setNewTask('')
      await loadTasks()
    } catch (error) {
      console.error('Error adding task:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, "todos", id))
      await loadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const toggleTask = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask()
    }
  }

  return (
    <div className="paper-todo">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-madas-primary" style={{fontFamily: "'Indie Flower', cursive, sans-serif"}}>
          Today's Tasks
        </h3>
        <button className="text-madas-primary hover:bg-madas-light p-2 rounded-lg">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a new task..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-madas-accent focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={addTask}
            disabled={loading || !newTask.trim()}
            className="bg-madas-primary text-white px-6 py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
        
        <ul className="space-y-3">
          {todos.map((todo) => (
            <li key={todo.id} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTask(todo.id)}
                className="w-5 h-5 text-madas-primary bg-gray-100 border-gray-300 rounded focus:ring-madas-primary focus:ring-2"
              />
              <span className={`flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {todo.task}
              </span>
              <button
                onClick={() => deleteTask(todo.id)}
                className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
          
          {todos.length === 0 && (
            <li className="text-center text-gray-500 py-8">
              No tasks yet. Add one above to get started!
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
