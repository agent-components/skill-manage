/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["listpage-components"],
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
