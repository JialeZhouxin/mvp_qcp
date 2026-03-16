import { Navigate, Route, Routes } from "react-router-dom";

import { getToken } from "./auth/token";
import TasksWorkspaceLayout from "./components/navigation/TasksWorkspaceLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import CircuitWorkbenchPage from "./pages/CircuitWorkbenchPage";
import CodeTasksPage from "./pages/CodeTasksPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TaskCenterPage from "./pages/TaskCenterPage";
import TaskHelpPage from "./pages/TaskHelpPage";

function App() {
  const defaultPath = getToken() ? "/tasks/center" : "/login";

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/tasks" element={<TasksWorkspaceLayout />}>
          <Route index element={<Navigate to="center" replace />} />
          <Route path="center" element={<TaskCenterPage />} />
          <Route path="circuit" element={<CircuitWorkbenchPage />} />
          <Route path="code" element={<CodeTasksPage />} />
          <Route path="help" element={<TaskHelpPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
}

export default App;
