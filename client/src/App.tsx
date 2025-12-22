import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [message, setMessage] = useState('Loading server status...')
  const [dbData, setDbData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch from server root
    axios.get('http://localhost:5000/')
      .then(res => setMessage(res.data))
      .catch(err => {
        console.error(err)
        setError('Failed to connect to server')
      })

    // Fetch from server DB test
    axios.get('http://localhost:5000/api/test-db')
      .then(res => setDbData(res.data))
      .catch(err => {
        console.error(err)
        // If we get a response from the server, it means we connected to the API, 
        // but the DB query failed.
        if (err.response && err.response.data && err.response.data.error) {
          setError(`Error: ${err.response.data.error}`)
        } else {
          // If no response, the server itself might be down or unreachable
          setError('Failed to connect to server')
        }
      })
  }, [])

  return (
    <div className="container">
      <h1>Assessment Project</h1>
      <div className="card">
        <h2>System Status</h2>
        <p><strong>Server:</strong> {error || message}</p>
        <p><strong>Database:</strong> {dbData ? 'Connected' : (error || 'Not Connected (Check console)')}</p>
        {dbData && <pre>{JSON.stringify(dbData, null, 2)}</pre>}
      </div>
    </div>
  )
}

export default App
