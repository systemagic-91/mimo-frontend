# Diretrizes de Código

## Visão Geral da Estrutura do Projeto

```
project-root/
  ├── i18n.config.json       # Manifesto de i18n para idiomas suportados e metadados de idioma
  ├── public/
  │   └── locales/           # Arquivos de tradução public/locales/{code}.json
  ├── src/
  │   ├── components/        # Todos os componentes de UI reutilizáveis
  │   │   └── ui/            # Componentes de UI predefinidos e personalizados, agrupados por função
  │   ├── hooks/             # Hooks personalizados do React
  │   ├── i18n/              # Runtime do i18n: config.ts (entrada) + util.ts (helpers)
  │   ├── lib/               # Funções utilitárias e bibliotecas
  │   ├── pages/             # Páginas da aplicação (cada página em seu próprio subdiretório)
  │   ├── App.tsx            # Componente principal da aplicação, configura os provedores de rota
  │   ├── router.tsx         # Configuração do roteador, configura o roteamento
  │   ├── main.tsx           # Ponto de entrada da aplicação React
  │   └── index.css          # Estilos globais
  ├── package.json           # Metadados e scripts do projeto
  ├── tailwind.config.ts     # Configuração do Tailwind CSS
  └── ...                    # Outros arquivos de configuração e lock
```

> Arquivos temporários de entrega ao backend (`scripts/`, `i18n.scan.json`, `reports/i18n/`, `docs/i18n-*.md`) são mantidos no repositório somente até que a integração das estatísticas, verificação e tradução automática do i18n com o backend seja concluída. Eles são de responsabilidade do backend a longo prazo e serão removidos assim que a integração for concluída.

## Responsabilidades dos Diretórios

- **public/**: Arquivos estáticos servidos diretamente. Coloque imagens, ícones e `robots.txt` aqui.
- **public/locales/**: Arquivos de tradução, um por idioma (`{code}.json`). Use chaves simples com pontos (por exemplo, `home.hero.title`); o arquivo de `fallbackLng` é a fonte estrutural de verdade.
- **public/logo/**: Versões da logo da marca em SVG (`luma-full`, `luma-horizontal`, `luma-symbol`), usadas pelo componente `src/components/logo.tsx`.
- **i18n.config.json**: Manifesto leve do i18n para o idioma de fallback, rótulos dos idiomas, aliases de detecção do navegador e direção do documento. É a única fonte de verdade para a lista de idiomas.
- **src/components/**: Todos os componentes de UI.
  - **ui/**: Contém componentes de UI atômicos e compostos.
  - _Agrupe componentes relacionados em subdiretórios quando compartilharem um domínio ou funcionalidade (por exemplo, `form/`, `charts/`)._
- **src/hooks/**: Hooks personalizados do React. Cada arquivo deve exportar um único hook focado em uma responsabilidade.
- **src/i18n/**: Apenas dois arquivos.
  - `config.ts` é o ponto de entrada do runtime: importa o manifesto por meio de `util.ts`, inicializa o i18next (backend HTTP, detector de idioma e integração com React), sincroniza `<html lang/dir>` e reexporta os helpers. Importar este arquivo por seu efeito colateral inicializa o i18next.
  - `util.ts` contém os helpers puros extraídos do manifesto: `fallbackLng`, `supportedLngs`, `languageOptions`, `normalizeLanguage`, `getLanguageDirection` e os tipos.
  - Os componentes usam diretamente o `useTranslation()` oficial do `react-i18next`; não existe um wrapper `useT` específico do projeto.
- **src/lib/**: Funções utilitárias e bibliotecas que não são componentes React nem hooks.
- **src/pages/**: Todas as páginas relacionadas às rotas.
  - _Cada página deve ter seu próprio subdiretório se contiver mais de um arquivo ou tiver lógica/componentes relacionados._
- **src/App.tsx**: Configura os provedores globais.
- **src/router.tsx**: Configura o roteamento.
- **src/main.tsx**: Ponto de entrada da aplicação.

**Importante:**
Sempre que um novo módulo (como um componente, hook ou utilitário) ou uma nova página for adicionada ou removida, este documento **deve ser atualizado imediatamente** para refletir as mudanças. Manter esta documentação atualizada garante que todos os colaboradores entendam a estrutura atual do projeto e sua organização pretendida.

## Como Adicionar Novo Código

### 1. Adicionando uma Nova Página

- **Crie um subdiretório em `src/pages/` para cada nova página.**
  - Exemplo: para uma página "Dashboard", crie `src/pages/dashboard/`.
- **Coloque o componente principal da página como `index.tsx` dentro do subdiretório.**
- **Adicione todos os componentes ou lógicas específicos da página no mesmo subdiretório.**
- **Registre a nova rota em `src/router.tsx` e gere um nome semântico.**
  - Exemplo:
    ```tsx
    import Dashboard from "./pages/dashboard";
    // ...
    {
      path: "/dashboard",
      name: 'dashboard',
      element: <Dashboard />
    }
    ```

### 2. Adicionando um Novo Componente

- **Se estiver adicionando um grupo de componentes relacionados, crie um subdiretório (por exemplo, `form/`, `charts/`).**
- **Se o componente for usado somente por uma página específica, coloque-o no subdiretório dessa página em `src/pages/`.**
- **Cada componente deve se concentrar em uma única responsabilidade.**
- **Arquivos pequenos (com menos de 100 linhas) são recomendados para um único componente.**

### 3. Adicionando um Novo Hook

- **Crie um novo arquivo em `src/hooks/` com o nome do hook (por exemplo, `use-feature.ts`).**
- **Cada arquivo deve exportar apenas um hook.**
- **Os hooks devem ser tão pequenos e focados quanto possível.**

### 4. Adicionando Utilitários

- **Adicione funções utilitárias a `src/lib/`.**
- **Agrupe utilitários relacionados no mesmo arquivo ou subdiretório, se necessário.**

### 5. Adicionando ou Atualizando Idiomas

- **Os metadados dos idiomas devem passar por `i18n.config.json`.**
- **Não defina diretamente os idiomas suportados, rótulos, aliases de detecção do navegador ou listas de direção RTL em `src/i18n/*.ts`.**
- **O conteúdo dos idiomas fica em `public/locales/{code}.json`** como JSON com chaves simples separadas por pontos; o arquivo de `fallbackLng` contém o conjunto canônico de chaves.
- **O código do runtime lê o manifesto somente por meio de `src/i18n/util.ts`.** Adicionar ou remover um idioma significa editar `i18n.config.json` e o arquivo correspondente `public/locales/{code}.json`; nada em `src/i18n/` precisa ser alterado.
- **As traduções são lidas com o `useTranslation()` oficial do `react-i18next`.** Não use hook personalizado nem conversões nos pontos de chamada.

## Boas Práticas de Código

- **Um módulo, uma responsabilidade:**  
  Cada arquivo (componente, hook ou utilitário) deve fazer apenas uma coisa.
- **Alta coesão e baixo acoplamento:**  
  Mantenha a lógica relacionada unida e evite dependências desnecessárias entre módulos.
- **Convenções de nomenclatura:**
  - Use `PascalCase` para componentes e diretórios de páginas.
  - Use `camelCase` para hooks e funções utilitárias.
  - Nomeie subdiretórios e arquivos de páginas de acordo com sua rota ou funcionalidade.
- **Estrutura de componentes:**
  - Mantenha os componentes pequenos e focados.
  - Extraia subcomponentes quando um componente ficar grande demais.
- **Estrutura de páginas:**
  - Coloque toda a lógica, hooks e componentes específicos de uma página no subdiretório dela.
  - Compartilhe código por meio de `components/`, `hooks/` ou `lib/` somente quando ele for realmente reutilizável.
- **Documentação:**
  - Adicione comentários para lógicas complexas.
  - Documente o propósito de cada módulo no início do arquivo quando isso não for óbvio.

## Exemplo: Adicionando uma Nova Página de "Perfil"

1. **Crie um diretório:**  
   `src/pages/profile/`
2. **Adicione o componente principal da página:**  
   `src/pages/profile/index.tsx`
3. **Adicione componentes específicos da página:**  
   `src/pages/profile/ProfileHeader.tsx`, `src/pages/profile/ProfileDetails.tsx`
4. **Registre a rota em `App.tsx`:**
   ```tsx
   import Profile from "./pages/profile";
   // ...
   <Route path="/profile" element={<Profile />} />;
   ```
5. **Se precisar de um botão reutilizável, adicione-o a `src/components/ui/button.tsx`.**
