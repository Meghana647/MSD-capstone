import { useState, useEffect } from 'react'
import axios from 'axios'
import io from 'socket.io-client'

const API_URL = 'http://localhost:5000/api'
const SOCKET_URL = 'http://localhost:5000'

function WorkerDashboard({ user, onLogout }) {
  const [requests, setRequests] = useState([])
  const [socket, setSocket] = useState(null)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    fetchRequests()

    // Setup socket connection for real-time notifications
    const newSocket = io(SOCKET_URL)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      newSocket.emit('register', user.userId)
    })

    newSocket.on('newRequest', (newRequest) => {
      setRequests(prev => [newRequest, ...prev])
      showNotification(`New request from ${newRequest.userId.name}!`)
      
      // Play notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PU6nm77BdGAg+ltryxnMpBSh+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSF1xe/glEILElyx6OyrWBUIQ5zi8sFuJAUuhM/z1YU2Bhxqvu7mnEoODlOm5O+zYBoGPJPY88p2KwUme8rx3I4+CRZiturqpVITC0mi4PK8aB8GM4vU8tGAMQYfccLu45ZFDBFYr+ftrVkXCECY3PLEcSYELIHO89h')
      audio.play().catch(() => {}) // Ignore autoplay errors
    })

    return () => {
      newSocket.disconnect()
    }
  }, [user.userId])

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/requests/worker/${user.userId}`)
      setRequests(response.data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    }
  }

  const showNotification = (message) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 5000)
  }

  const handleRequestAction = async (requestId, status) => {
    try {
      await axios.patch(`${API_URL}/requests/${requestId}`, { status })
      setRequests(prev => 
        prev.map(req => req._id === requestId ? { ...req, status } : req)
      )
      alert(`Request ${status} successfully!`)
    } catch (error) {
      alert('Error updating request: ' + (error.response?.data?.message || error.message))
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#FFA500'
      case 'accepted': return '#4CAF50'
      case 'rejected': return '#f44336'
      case 'completed': return '#2196F3'
      default: return '#777'
    }
  }

  const pendingRequests = requests.filter(req => req.status === 'pending')
  const otherRequests = requests.filter(req => req.status !== 'pending')

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Worker Dashboard</h1>
        <div className="header-info">
          <span>Welcome, {user.name}!</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {notification && (
        <div className="notification">
          🔔 {notification}
        </div>
      )}

      <div className="requests-section">
        <h2>Pending Requests ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <p className="no-data">No pending requests</p>
        ) : (
          <div className="requests-list">
            {pendingRequests.map(request => (
              <div key={request._id} className="request-card pending">
                <div className="request-header">
                  <h3>From: {request.userId?.name}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(request.status) }}
                  >
                    {request.status}
                  </span>
                </div>
                <p><strong>Description:</strong> {request.description}</p>
                <p><strong>Location:</strong> {request.location}</p>
                <p><strong>Client Phone:</strong> {request.userId?.phone}</p>
                <p><strong>Client Address:</strong> {request.userId?.address}</p>
                <p className="date">Received: {new Date(request.createdAt).toLocaleString()}</p>
                
                <div className="request-actions">
                  <button 
                    className="accept-btn"
                    onClick={() => handleRequestAction(request._id, 'accepted')}
                  >
                    Accept
                  </button>
                  <button 
                    className="reject-btn"
                    onClick={() => handleRequestAction(request._id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: '40px' }}>Request History</h2>
        {otherRequests.length === 0 ? (
          <p className="no-data">No history yet</p>
        ) : (
          <div className="requests-list">
            {otherRequests.map(request => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <h3>From: {request.userId?.name}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(request.status) }}
                  >
                    {request.status}
                  </span>
                </div>
                <p><strong>Description:</strong> {request.description}</p>
                <p><strong>Location:</strong> {request.location}</p>
                <p><strong>Client Phone:</strong> {request.userId?.phone}</p>
                <p className="date">Received: {new Date(request.createdAt).toLocaleString()}</p>
                
                {request.status === 'accepted' && (
                  <button 
                    className="complete-btn"
                    onClick={() => handleRequestAction(request._id, 'completed')}
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkerDashboard