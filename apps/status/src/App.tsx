import { Routes, Route } from "react-router-dom"
import StatusPage from "./pages/StatusPage"
import IncidentDetail from "./pages/IncidentDetail"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StatusPage />} />
      <Route path="/incidents/:id" element={<IncidentDetail />} />
    </Routes>
  )
}
