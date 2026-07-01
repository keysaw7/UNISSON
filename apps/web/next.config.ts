import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Racine du monorepo explicite : évite l'inférence erronée en présence d'un
  // package-lock.json hors du dépôt (ex. dans le HOME de l'utilisateur).
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
