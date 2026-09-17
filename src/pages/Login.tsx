import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/domain";
import { ROLE_LABEL } from "@/lib/status";

const DEMO_USERS = [
  { email: "socios@luma.com.br", role: "owner" },
  { email: "equipe@luma.com.br", role: "staff" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = login(email, password);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível entrar.");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-none"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@luma.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="rounded-md border border-late/30 bg-late-bg px-3 py-2 text-sm text-late">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>

        <div className="mt-4 rounded-lg border border-border p-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Acesso de demonstração — senha{" "}
            <span className="font-mono">luma123</span>
          </p>
          <ul className="space-y-1.5">
            {DEMO_USERS.map((u) => (
              <li
                key={u.email}
                className="flex items-center justify-between gap-2"
              >
                <span className="font-mono text-xs text-foreground">
                  {u.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABEL[u.role]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
