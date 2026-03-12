import { Navigate, Route, Routes } from "react-router-dom";

import { getToken } from "./auth/token";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CircuitWorkbenchPage from "./pages/CircuitWorkbenchPage";
import CodeTasksPage from "./pages/CodeTasksPage";

function App() {
  const defaultPath = getToken() ? "/tasks/circuit" : "/login";

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/tasks" element={<Navigate to="/tasks/circuit" replace />} />
        <Route path="/tasks/circuit" element={<CircuitWorkbenchPage />} />
        <Route path="/tasks/code" element={<CodeTasksPage />} />
      </Route>
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
}

export default App;
