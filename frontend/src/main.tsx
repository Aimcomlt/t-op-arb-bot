import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WalletProviders } from "./wallet";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WalletProviders>
      <App />
    </WalletProviders>
  </React.StrictMode>,
);
