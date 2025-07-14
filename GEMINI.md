# Gemini Project Context

This file provides context for the Gemini AI assistant to understand and effectively assist with this project.

## Project Overview

This is a full-stack application with a React frontend and a Node.js (Express) backend. The application appears to be a dashboard for managing sales data, likely integrating with the Bling ERP system.

## Key Technologies

- **Frontend:** React, TypeScript, Vite, Material-UI (MUI), i18next
- **Backend:** Node.js, Express.js, PostgreSQL (based on the `pg` driver)
- **Package Manager:** Yarn

## Project Structure

- `frontend/`: Contains the React user interface.
- `backend/`: Contains the Node.js API server.

## Important Commands

### Frontend (`/frontend` directory)

- **`yarn dev`**: Starts the development server for the frontend.
- **`yarn build`**: Builds the frontend for production.
- **`yarn lint`**: Lints the frontend code.
- **`yarn test`**: (Assuming this is the command, though not explicitly defined) Runs the test suite.

### Backend (`/backend` directory)

- **`npm start`**: Starts the backend server.

## Development Workflow

1.  **Start the backend:** Navigate to the `backend` directory and run `npm start`.
2.  **Start the frontend:** In a separate terminal, navigate to the `frontend` directory and run `yarn dev`.
3.  The frontend will be available at `http://localhost:5173` (or another port specified by Vite) and will make API calls to the backend.

## Coding Conventions

- The project uses Prettier for code formatting and ESLint for linting. Please adhere to the existing styles.
- Commit messages should be clear and descriptive.

## Recent Changes (10 de julho de 2025)

- **Refatoração do Backend:** Unificação das rotas de dashboard (`/metricas`, `/comparativo-anual`, `/produtos-mais-vendidos`) em uma única rota `/all` para otimizar chamadas à API do Bling e evitar o limite de requisições.
- **Refatoração do Frontend:** Consolidação das chamadas de API para o dashboard em um único `useEffect` que consome a nova rota `/all`.
- **Gráfico "Comparativo anual de vendas":**
    - Alterado o título para "Comparativo anual de vendas".
    - Implementada a busca de dados reais do backend para o gráfico.
    - Corrigida a formatação dos números no gráfico (eixo Y e tooltip) para `80.000` em vez de `80000.000000000`.
    - Habilitado o efeito de hover na legenda para destacar a série de dados.
    - Melhorado o visual das barras do gráfico (cantos arredondados, sem contorno).
- **Gráfico "Produtos mais vendidos":**
    - Alterado o título para "Produtos mais vendidos".
    - Implementada a busca de dados reais do backend para o gráfico de pizza (top 5 produtos).
    - Adicionada renderização condicional no frontend para exibir uma mensagem caso não haja dados, evitando erros de "nó não encontrado".