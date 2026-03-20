import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../api/auth";
import { toErrorMessage } from "../api/errors";
import { useAuthSession } from "../auth/session";

function LoginPage() {
  const navigate = useNavigate();
  const { login: loginSession } = useAuthSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login({ username, password });
      loginSession(data.access_token);
      navigate("/tasks", { replace: true });
    } catch (err) {
      setError(toErrorMessage(err, "login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Segoe UI, sans-serif" }}>
      <h1>µÇÂ¼</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ÓÃ»§Ãû" required />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ÃÜÂë"
          required
        />
        <button type="submit" disabled={loading}>{loading ? "µÇÂ¼ÖÐ..." : "µÇÂ¼"}</button>
      </form>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      <p>
        Ã»ÓÐÕËºÅ£¿<Link to="/register">×¢²á</Link>
      </p>
    </main>
  );
}

export default LoginPage;
