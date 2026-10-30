import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" => GitHub Pages par kisi bhi repo name ke saath chalega
export default defineConfig({ plugins: [react()], base: "./" });
