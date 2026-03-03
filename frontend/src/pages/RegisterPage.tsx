import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../api/auth";
import { toErrorMessage } from "../api/errors";

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({ username, password });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(toErrorMessage(err, "register failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Segoe UI, sans-serif" }}>
      <h1>注册</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" required />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          required
        />
        <button type="submit" disabled={loading}>{loading ? "提交中..." : "注册"}</button>
      </form>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      <p>
        已有账号？<Link to="/login">去登录</Link>
      </p>
    </main>
  );
}

export default RegisterPage;
