import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import {
  clearAppStorage,
  consumeLoginMessage,
  getStoredMustChangePassword,
  getStoredToken,
  saveAuthUser,
  saveToken,
  setMustChangePassword,
} from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { apiBaseURL } from "../services/api";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshMe } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notice] = useState<string | null>(() => consumeLoginMessage());
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    const existingToken = getStoredToken();
    const mustChangePassword = getStoredMustChangePassword();
    if (existingToken) {
      navigate(mustChangePassword ? "/change-password" : from, { replace: true });
    }
  }, [from, navigate]);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = "Email obrigatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Email invalido";
    }

    if (!password.trim()) {
      nextErrors.password = "Senha obrigatoria";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Evita qualquer submit nativo residual que geraria reload
    event.nativeEvent?.stopImmediatePropagation?.();

    if (isLoading) return;
    setError(null);
    if (!validate()) return;
    setIsLoading(true);
    try {
      clearAppStorage();
      if (import.meta.env.DEV) {
        console.log("[login] baseURL:", apiBaseURL);
        console.log("[login] endpoint:", "/api/auth/login");
        console.log("[login] submit controlado via React (sem reload).");
      }

      const response = await login({ email: email.trim(), password });
      const token = response.token ?? response.accessToken;
      if (!token) {
        throw new Error("Token nao encontrado.");
      }
      saveToken(token);
      const mustChangePassword = Boolean(response.mustChangePassword);
      setMustChangePassword(mustChangePassword);
      const responseUser = response.user ?? {
        name: response.name,
        email: response.email,
      };
      if (responseUser?.name || responseUser?.email) {
        saveAuthUser(responseUser);
      }
      if (mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }
      await refreshMe();
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Credenciais invalidas.") {
        setError("Credenciais invalidas");
      } else {
        setError("Falha ao conectar na API");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-900">
          Despesas
        </h1>
        {notice && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {notice}
          </p>
        )}
        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="seu@email.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Senha</span>
            <input
              type="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Digite a senha"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
