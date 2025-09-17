/*import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
*/

// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import EmployeeCreatePage from "./pages/EmployeeCreatePage";
import Employees from "./pages/Employees";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página de inicio provisional */}
        <Route
          path="/"
          element={
            <div style={{ padding: "2rem" }}>
              <h1>HT SETECCA</h1>
              <p>
                <a href="/employees/new" style={{ textDecoration: "underline" }}>
          Agregar empleado
        </a>{" "}


                Abre <code>/employees/1</code> (con un ID real de tu BD) para
                probar el perfil de empleado.
              </p>
            </div>
          }
        />

        {/* Ruta del perfil de empleado */}
        <Route path="/employees/:id" element={<EmployeeProfilePage />} />
        <Route path="/employees/new" element={<EmployeeCreatePage />} />
        <Route path="/employees" element={<Employees />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;
