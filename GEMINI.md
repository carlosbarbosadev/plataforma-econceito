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
