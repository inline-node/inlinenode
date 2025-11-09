import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Adjust the base path to match your GitHub Pages setup
export default defineConfig({
  plugins: [react()],
  base: "/", // stays clean since you use a custom domain
});
