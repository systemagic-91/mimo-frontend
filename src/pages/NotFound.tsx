import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <Logo size="lg" />
      <div className="text-center">
        <h1 className="font-serif text-5xl font-medium text-gold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Página não encontrada.
        </p>
      </div>
      <a href="/">
        <Button variant="outline">Voltar ao início</Button>
      </a>
    </div>
  );
};

export default NotFound;
