import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './components/Auth/LoginPage'
import { RequireAuth } from './components/Auth/RequireAuth'
import { MainLayout } from './components/Layout/MainLayout'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { KanbanPage } from './pages/KanbanPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { TagsPage } from './pages/TagsPage'
import { TeamPage } from './pages/TeamPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          <Route index element={<KanbanPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/team" element={<TeamPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
