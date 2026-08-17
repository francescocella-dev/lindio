import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router.jsx";
import { registerLindioServiceWorker } from "./services/pwaService.js";
import "./styles/globals.css";

if (import.meta.env.PROD) {
  window.addEventListener(
    "load",
    () => {
      void registerLindioServiceWorker();
    },
    { once: true }
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
