/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["listpage-components"],
  async redirects() {
    return [
      { source: "/projects", destination: "/skill-sets", permanent: false },
      { source: "/projects/:path*", destination: "/skill-sets/:path*", permanent: false },
      { source: "/api/projects", destination: "/api/skill-sets", permanent: false },
      {
        source: "/api/projects/:path*",
        destination: "/api/skill-sets/:path*",
        permanent: false,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@xterm/xterm": false,
        "@xterm/addon-fit": false,
        "pty-session-mcp": false,
      };
    }
    return config;
  },
};

export default nextConfig;
