import { useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Paybot</h1>
        <p>Robot Control with X402 Micropayments</p>
      </header>

      <main className="app-main">
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Vite + React + TypeScript app initialized successfully!
          </p>
        </div>

        <div className="info">
          <h2>Configuration</h2>
          <ul>
            <li>
              <strong>Chain ID:</strong> {import.meta.env.VITE_CHAIN_ID}
            </li>
            <li>
              <strong>RPC URL:</strong> {import.meta.env.VITE_RPC_URL}
            </li>
            <li>
              <strong>Bot ID:</strong> {import.meta.env.VITE_BOT_ID}
            </li>
            <li>
              <strong>Bot Name:</strong> {import.meta.env.VITE_BOT_NAME}
            </li>
          </ul>
        </div>
      </main>

      <footer className="app-footer">
        <p>Built for EthGlobal Hackathon</p>
      </footer>
    </div>
  );
}

export default App;
