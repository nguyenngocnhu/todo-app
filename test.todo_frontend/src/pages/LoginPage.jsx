import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = useAuth();

  function handleSubmit(e) {
    e.preventDefault();
    (async () => {
      try {
        await auth.login(username, password);
        navigate("/todo");
      } catch (err) {
        setError("Invalid username or password");
      }
    })();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg p-12 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-semibold text-center mb-6">Login</h1>

        <div className="h-px bg-gray-200 w-2/3 mx-auto mb-8" />

        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <label className="block mb-6">
            <span className="text-sm text-gray-500 block mb-2">Account</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder=""
              className="appearance-none bg-transparent w-full px-0 py-2 border-b-2 border-gray-300 focus:border-[#f59e0b] focus:outline-none"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-500 block mb-2">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder=""
              className="appearance-none bg-transparent w-full px-0 py-2 border-b-2 border-gray-300 focus:border-[#f59e0b] focus:outline-none"
            />
          </label>

          {error && (
            <div className="mb-4 text-red-600 text-center">{error}</div>
          )}

          <div className="flex justify-center">
            <button
              type="submit"
              className="mt-6 bg-[#f59e0b] text-[#1b1b1b] px-10 py-2 rounded-2xl shadow-md hover:brightness-95"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
