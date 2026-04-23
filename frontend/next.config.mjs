const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:3000/api/:path*",
      },
    ];
  },
  reactCompiler: true,
};
export default nextConfig;