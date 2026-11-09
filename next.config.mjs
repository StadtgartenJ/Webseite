/** @type {import('next').NextConfig} */
const nextConfig = {
  // Statischer Export für GitHub Pages (Ordner `out/`)
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
