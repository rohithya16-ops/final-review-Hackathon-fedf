# Eazypezy React + Vite

## Run the project

1. Extract this ZIP.
2. Open the `eazypezy-react` folder in VS Code.
3. Open the terminal in that folder and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL shown by Vite (usually `http://localhost:5173`).

## React structure

```text
src/
├── components/
│   ├── Auth.jsx
│   ├── Customer.jsx
│   ├── Manager.jsx
│   ├── Delivery.jsx
│   └── Admin.jsx
├── App.jsx
├── main.jsx
├── style.css
└── auth.css
```

## React Router paths

- `/` – Login / Signup
- `/customer` – Customer dashboard
- `/manager` – Restaurant manager dashboard
- `/delivery` – Delivery partner dashboard
- `/admin` – Admin dashboard

Role-protected routes check the active session before displaying a dashboard. Navigation after login and logout uses React Router. The existing localStorage data layer remains in `public/legacy/js/data.js`.
