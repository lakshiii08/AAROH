/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL;
    if (!backendUrl) {
      return [];
    }

    const cleanBackendUrl = backendUrl.replace(/\/+$/, "");
    const destinationBase = cleanBackendUrl.endsWith("/api/v1")
      ? cleanBackendUrl
      : `${cleanBackendUrl}/api/v1`;

    return [
      {
        source: "/api/v1/:path*",
        destination: `${destinationBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
