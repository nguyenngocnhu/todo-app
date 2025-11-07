import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TodoPage from "./pages/TodoPage";
import { useAuth } from "./AuthContext";

function RequireAuth({ children }) {
  const auth = useAuth();
  if (auth.initializing) return null;
  if (!auth.isAuthenticated) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/todo"
        element={
          <RequireAuth>
            <TodoPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
