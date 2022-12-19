import React from "react";
import { createRoot } from "react-dom/client";
import MainView from "./views/main-view";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<MainView tab="home" />);
