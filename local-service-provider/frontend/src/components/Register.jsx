import { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:5000/api'

function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'user',
    skills: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const dataToSend = {
        ...formData,
        skills: formData.role === 'worker' ? formData.skills.split(',').map(s => s.trim()) : []
      }
      
      await axios.post(`${API_URL}/register`, dataToSend)
      alert('Registration successful! Please login.')
      onRegisterSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Local Service Provider</h2>
        <p className="subtitle">Create your account</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Address:</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Role:</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="user">User (Hire Workers)</option>
              <option value="worker">Worker (Get Hired)</option>
            </select>
          </div>

          {formData.role === 'worker' && (
            <div className="form-group">
              <label>Skills (comma-separated):</label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g., Plumber, Electrician, Carpenter"
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <p className="switch-auth">
          Already have an account? 
          <button onClick={onSwitchToLogin}>Login</button>
        </p>
      </div>
    </div>
  )
}

export default Register