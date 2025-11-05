# Todo App — .NET API + React (Vite)

This repository contains a small Todo application with a .NET Web API (Entity Framework Core + SQLite) and a React frontend (Vite + Tailwind + Axios).

This README explains how to run the project locally (without Docker), how to test the API and UI, and includes a short API usage reference for graders.

Quick summary
- Backend: `test.todo_api` (ASP.NET Core, SQLite) — default URL: http://localhost:5000
- Frontend: `test.todo_frontend` (React + Vite) — dev URL: http://localhost:5173, static serve example: http://localhost:3000
- SQLite DB (dev): `test.todo_api\todo.db`

Requirements
- .NET SDK (project targets net9.0) — install from https://dotnet.microsoft.com/
- Node.js (v18+ recommended) + npm — https://nodejs.org/
- (Optional) `serve` for serving a production build: `npm install -g serve` or use `npx serve`

Project layout

- `test.todo_api/` — .NET Web API
  - `Program.cs`, `Controllers/TodoController.cs`, `Data/TodoContext.cs`, `Models/TodoItem.cs`
  - `appsettings.json` (contains default connection string)
  - `todo.db` (created on first run)
- `test.todo_frontend/` — React app (Vite)
  - `package.json`, `vite.config.js`, `src/` (pages/components/services)

Run the backend (local)

1. Open a PowerShell (or terminal) at the repo root and change to the API folder:

```powershell
cd .\test.todo_api
```

2. Restore and run the API (development):

```powershell
dotnet restore
dotnet run --urls "http://localhost:5000"
```

The app will start and (if enabled) expose Swagger at `http://localhost:5000`.

Notes about the SQLite DB
- The API uses a SQLite file `todo.db` stored in the `test.todo_api` folder by default. After the first request that touches the DB a file will be created at `test.todo_api\todo.db`.
- You can inspect it with DB Browser for SQLite or a VS Code SQLite extension.

Run the frontend

Development server (recommended while iterating):

```powershell
cd .\test.todo_frontend
npm install
npm run dev
```

This runs Vite's dev server (hot reload) — the site typically opens at `http://localhost:5173`.

Serve a production build (static)

```powershell
cd .\test.todo_frontend
npm install
npm run build
npx serve -s dist -l 3000
```

The production static site will be available at `http://localhost:3000` in this example.

---

## Frontend quick README (todo-frontend)

This project folder is `test.todo_frontend` in this repository. Below is a compact README for the frontend to include in the main README for graders.

Requirements
- Node.js 18+
- npm
- Backend: TodoApi running at http://localhost:5000

Setup

1. Install dependencies

```bash
cd test.todo_frontend
npm install
```

2. Start dev server

```bash
npm run dev
# or (legacy alias in some setups)
npm start
```

3. Open the URL printed by Vite (usually http://localhost:5173). The app expects the backend at http://localhost:5000.

Login
- username: `admin`
- password: `123`

API endpoints used by the frontend
- GET http://localhost:5000/api/todo          -> list todos
- GET http://localhost:5000/api/todo/{id}     -> get single todo
- POST http://localhost:5000/api/todo         -> create todo (body: { title, isCompleted })
- PUT http://localhost:5000/api/todo/{id}     -> update todo
- DELETE http://localhost:5000/api/todo/{id}  -> delete todo

Notes / Integration
- If the frontend cannot reach the backend due to CORS, enable CORS in the TodoApi (allow origin http://localhost:5173 or *) or run both on the same origin.
- The backend must return JSON in responses and follow the routes above.

Optional
- To produce a production build: `npm run build` then serve the `dist` folder.


API usage reference (short)

Base URL
- http://localhost:5000/api/todo

Endpoints

- GET /api/todo
  - Description: Get all todos
  - Response: 200 OK
  - Response body example:

```json
[{
  "id": 1,
  "title": "Buy milk",
  "isCompleted": false
}]
```

- GET /api/todo/{id}
  - Description: Get a single todo by id
  - Response: 200 OK (todo) or 404 Not Found

- POST /api/todo
  - Description: Create a todo
  - Request body (JSON):

```json
{
  "title": "New task",
  "isCompleted": false
}
```

  - Response: 201 Created with created object

- PUT /api/todo/{id}
  - Description: Update a todo (replace fields)
  - Request body (JSON):

```json
{
  "id": 1,
  "title": "Updated title",
  "isCompleted": true
}
```

  - Response: 200 OK (updated object) or 404 Not Found

- DELETE /api/todo/{id}
  - Description: Delete a todo
  - Response: 204 No Content or 404 Not Found

Simple test examples

PowerShell (Windows)

```powershell
# Create
$body = @{ title = 'Test from PS'; isCompleted = $false } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/todo -Body $body -ContentType 'application/json'

# Read
Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/todo

# Update (replace id)
$update = @{ id = 1; title = 'Updated title'; isCompleted = $true } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri http://localhost:5000/api/todo/1 -Body $update -ContentType 'application/json'

# Delete
Invoke-RestMethod -Method Delete -Uri http://localhost:5000/api/todo/1
```

curl (cross-platform)

```bash
# Create
curl -X POST http://localhost:5000/api/todo -H "Content-Type: application/json" -d '{"title":"Test","isCompleted":false}'

# Read
curl http://localhost:5000/api/todo

# Update
curl -X PUT http://localhost:5000/api/todo/1 -H "Content-Type: application/json" -d '{"id":1,"title":"Updated","isCompleted":true}'

# Delete
curl -X DELETE http://localhost:5000/api/todo/1
```

Testing end-to-end with the UI

1. Start the backend (dotnet run) so the API is available at `http://localhost:5000`.
2. Start the frontend dev server (`npm run dev`) or serve the built `dist/` folder.
3. Open the frontend in the browser and use the UI to create, update, toggle, and delete todos. Verify the actions in the UI and the DB file.

CORS note

- If you serve the frontend on a port other than Vite's default (5173), you may need to update the API's CORS policy. The backend's development CORS policy allows `http://localhost:5173` and `http://localhost:5174` by default. If you serve the static build on port `3000`, you may see CORS errors when the frontend calls the API — options:
  - Serve frontend from `5173` during development.
  - Update `Program.cs` to allow `http://localhost:3000` or add a permissive policy while testing.

Troubleshooting

- Port in use: change the API port: `dotnet run --urls "http://localhost:5001"` or change frontend port in Vite.
- Locked files during build: ensure no other `dotnet run` process is running for the same project. Stop it or reboot.
- DB not created: call the API (e.g., POST /api/todo) and the `todo.db` file will be created under `test.todo_api`.

---

If you run into any problems while following these steps, paste the console output and I'll help diagnose the issue.

Good luck, and thanks for reviewing the project!
