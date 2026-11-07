
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, CheckSquare } from "lucide-react";
import api from "../services/api";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("accounts/register/", {
        username,
        email,
        password,
      });

      navigate("/login", {
        state: { message: "Account created successfully. Please sign in." },
      });
    } catch (err) {
      const data = err.response?.data;

      const errorMessage = data
        ? Object.entries(data)
            .map(([field, messages]) =>
              `${field}: ${Array.isArray(messages) ? messages.join(" ") : messages}`
            )
            .join(" ")
        : "Unable to create your account. Please try again.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <CheckSquare size={30} />
          </div>

          <h1 className="text-3xl font-bold text-slate-800">
            Create Account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Get started with your task management workspace
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Username
            </label>

            <div className="flex items-center rounded-lg border border-slate-300 px-3 focus-within:border-indigo-500">
              <User size={19} className="text-slate-400" />

              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose a username"
                className="w-full bg-transparent p-3 text-sm outline-none"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email Address
            </label>

            <div className="flex items-center rounded-lg border border-slate-300 px-3 focus-within:border-indigo-500">
              <Mail size={19} className="text-slate-400" />

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="w-full bg-transparent p-3 text-sm outline-none"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <div className="flex items-center rounded-lg border border-slate-300 px-3 focus-within:border-indigo-500">
              <Lock size={19} className="text-slate-400" />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-transparent p-3 text-sm outline-none"
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>

            <div className="flex items-center rounded-lg border border-slate-300 px-3 focus-within:border-indigo-500">
              <Lock size={19} className="text-slate-400" />

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                className="w-full bg-transparent p-3 text-sm outline-none"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
