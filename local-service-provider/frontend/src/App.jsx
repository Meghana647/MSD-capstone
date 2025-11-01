import { useState, useEffect } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import UserDashboard from './components/UserDashboard'
import WorkerDashboard from './components/WorkerDashboard'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('login')
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
      const parsedUser = JSON.parse(savedUser)
      setCurrentView(parsedUser.role === 'user' ? 'userDashboard' : 'workerDashboard')
    }
  }, [])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    setCurrentView(userData.role === 'user' ? 'userDashboard' : 'workerDashboard')
  }

  const handleRegisterSuccess = () => {
    setCurrentView('login')
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    setCurrentView('login')
  }

  return (
    <div className="App">
      {currentView === 'login' && (
        <Login 
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setCurrentView('register')}
        />
      )}
      
      {currentView === 'register' && (
        <Register 
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      )}
      
      {currentView === 'userDashboard' && user && (
        <UserDashboard user={user} onLogout={handleLogout} />
      )}
      
      {currentView === 'workerDashboard' && user && (
        <WorkerDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App