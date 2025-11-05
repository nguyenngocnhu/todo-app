import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TodoPage from "./pages/TodoPage";

function isLogged() {
  return localStorage.getItem("isLogged") === "true";
}

function RequireAuth({ children }) {
  if (!isLogged()) return <Navigate to="/" />;
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
