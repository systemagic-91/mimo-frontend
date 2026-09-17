import { AppShell } from "@/components/layout/app-shell";
import { RequireAuth, RequireRole } from "@/components/auth/guards";
import { HomeRedirect } from "@/components/auth/home-redirect";
import Login from "@/pages/Login";
import Estoque from "@/pages/Estoque";
import Consignacao from "@/pages/Consignacao";
import ConsignacaoSeller from "@/pages/ConsignacaoSeller";
import NovaConsignacao from "@/pages/NovaConsignacao";
import Etiquetagem from "@/pages/Etiquetagem";
import Relatorios from "@/pages/Relatorios";
import Configuracoes from "@/pages/Configuracoes";
import NotFound from "@/pages/NotFound";

export const routers = [
  {
    path: "/login",
    name: "login",
    element: <Login />,
  },
  {
    path: "/",
    name: "app",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, name: "home", element: <HomeRedirect /> },
      { path: "estoque", name: "estoque", element: <Estoque /> },
      { path: "consignacao", name: "consignacao", element: <Consignacao /> },
      {
        path: "consignacao/nova",
        name: "nova-consignacao",
        element: <NovaConsignacao />,
      },
      {
        path: "consignacao/:sellerId",
        name: "consignacao-seller",
        element: <ConsignacaoSeller />,
      },
      { path: "etiquetagem", name: "etiquetagem", element: <Etiquetagem /> },
      {
        path: "relatorios",
        name: "relatorios",
        element: (
          <RequireRole role="owner">
            <Relatorios />
          </RequireRole>
        ),
      },
      {
        path: "configuracoes",
        name: "configuracoes",
        element: (
          <RequireRole role="owner">
            <Configuracoes />
          </RequireRole>
        ),
      },
    ],
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
