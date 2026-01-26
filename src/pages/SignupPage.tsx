import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signup } from "../api/auth";
import {
  clearAppStorage,
  getStoredMustChangePassword,
  getStoredToken,
  saveAuthUser,
  saveToken,
  setMustChangePassword,
} from "../api/client";
import { useAuth } from "../contexts/AuthContext";

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const SignupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshMe } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const from = useMemo(
    () => ((location.state as { from?: string } | null)?.from ?? "/"),
    [location.state],
  );

  useEffect(() => {
    const existingToken = getStoredToken();
    const mustChangePassword = getStoredMustChangePassword();
    if (existingToken) {
      navigate(mustChangePassword ? "/change-password" : from, { replace: true });
    }
  }, [from, navigate]);

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = "Email obrigatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Email invalido";
    }

    if (!password.trim()) {
      nextErrors.password = "Senha obrigatoria";
    } else if (password.length < 6) {
      nextErrors.password = "A senha precisa ter ao menos 6 caracteres";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "As senhas nao conferem";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();

    if (isLoading) return;
    setError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      clearAppStorage();
      const response = await signup({ email: email.trim(), password });
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
      const message = err instanceof Error ? err.message : "Erro ao conectar na API";
      if (/email/i.test(message) || message.includes("Ja existe")) {
        setError("Email ja cadastrado");
      } else {
        setError("Falha ao cadastrar usuario");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-900">
          Criar conta
        </h1>
        <p className="mb-4 text-center text-sm text-slate-500">
          Crie uma conta e comece a registrar despesas imediatamente.
        </p>
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
              placeholder="Crie uma senha forte"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Confirmar senha
            </span>
            <input
              type="password"
              name="confirmPassword"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Repita a senha"
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isLoading ? "Cadastrando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Ja possui conta?{" "}
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
