import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import AttendeesPage from './pages/AttendeesPage'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ScanResult from './pages/ScanResult'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="attendees" element={<AttendeesPage />} />
        </Route>
        <Route path="/scan/:ticketId" element={<ScanResult />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
