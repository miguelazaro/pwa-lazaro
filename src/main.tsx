import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "./register-sw";

const rootEl = document.getElementById("root");
const splash = document.getElementById("splash");


if (splash) splash.classList.add("hide");
if (rootEl) rootEl.classList.remove("hide");

if (!rootEl) {
  throw new Error("No se encontró el elemento #root en index.html");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerSW();