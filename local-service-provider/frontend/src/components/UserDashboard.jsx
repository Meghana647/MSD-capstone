import { useState, useEffect } from 'react'
import axios from 'axios'
import io from 'socket.io-client'

const API_URL = 'http://localhost:5000/api'
const SOCKET_URL = 'http://localhost:5000'

function UserDashboard({ user, onLogout }) {
  const [workers, setWorkers] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [requestForm, setRequestForm] = useState({
    description: '',
    location: ''
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('workers')
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    fetchWorkers()
    fetchMyRequests()

    // Setup socket connection
    const newSocket = io(SOCKET_URL)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      newSocket.emit('register', user.userId)
    })

    newSocket.on('requestStatusUpdate', (updatedRequest) => {
      setMyRequests(prev => 
        prev.map(req => req._id === updatedRequest._id ? updatedRequest : req)
      )
      
      if (updatedRequest.status === 'accepted') {
        alert(`Worker ${updatedRequest.workerId?.name} accepted your request!`)
      }
    })

    return () => {
      newSocket.disconnect()
    }
  }, [user.userId])

  const fetchWorkers = async () => {
    try {
      const response = await axios.get(`${API_URL}/workers`)
      setWorkers(response.data)
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }

  const fetchMyRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/requests/user/${user.userId}`)
      setMyRequests(response.data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    }
  }

  const handleSendRequest = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await axios.post(`${API_URL}/requests`, {
        userId: user.userId,
        workerId: selectedWorker._id,
        description: requestForm.description,
        location: requestForm.location
      })
      
      alert('Request sent successfully!')
      setSelectedWorker(null)
      setRequestForm({ description: '', location: '' })
      fetchMyRequests()
    } catch (error) {
      alert('Error sending request: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>User Dashboard</h1>
        <div className="header-info">
          <span>Welcome, {user.name}!</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="tabs">
        <button 
          className={activeTab === 'workers' ? 'active' : ''} 
          onClick={() => setActiveTab('workers')}
        >
          Find Workers
        </button>
        <button 
          className={activeTab === 'requests' ? 'active' : ''} 
          onClick={() => setActiveTab('requests')}
        >
          My Requests
        </button>
      </div>

      {activeTab === 'workers' && (
        <div className="workers-section">
          <h2>Available Workers</h2>
          <div className="workers-grid">
            {workers.map(worker => (
              <div key={worker._id} className="worker-card">
                <h3>{worker.name}</h3>
                <p><strong>Skills:</strong> {worker.skills?.join(', ') || 'N/A'}</p>
                <p><strong>Phone:</strong> {worker.phone}</p>
                <p><strong>Address:</strong> {worker.address}</p>
                <button onClick={() => setSelectedWorker(worker)}>
                  Send Request
                </button>
              </div>
            ))}
          </div>

          {selectedWorker && (
            <div className="modal">
              <div className="modal-content">
                <h2>Send Request to {selectedWorker.name}</h2>
                <form onSubmit={handleSendRequest}>
                  <div className="form-group">
                    <label>Job Description:</label>
                    <textarea
                      value={requestForm.description}
                      onChange={(e) => setRequestForm({...requestForm, description: e.target.value})}
                      required
                      placeholder="Describe the work you need..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Location:</label>
                    <input
                      type="text"
                      value={requestForm.location}
                      onChange={(e) => setRequestForm({...requestForm, location: e.target.value})}
                      required
                      placeholder="Work location"
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="submit" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Request'}
                    </button>
                    <button type="button" onClick={() => setSelectedWorker(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="requests-section">
          <h2>My Requests</h2>
          {myRequests.length === 0 ? (
            <p className="no-data">No requests yet</p>
          ) : (
            <div className="requests-list">
              {myRequests.map(request => (
                <div key={request._id} className="request-card">
                  <div className="request-header">
                    <h3>Worker: {request.workerId?.name}</h3>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(request.status) }}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p><strong>Description:</strong> {request.description}</p>
                  <p><strong>Location:</strong> {request.location}</p>
                  <p><strong>Worker Skills:</strong> {request.workerId?.skills?.join(', ')}</p>
                  <p><strong>Worker Phone:</strong> {request.workerId?.phone}</p>
                  <p className="date">Requested on: {new Date(request.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UserDashboard