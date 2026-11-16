/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure CORS and headers for direct media access
  async headers() {
    return [
      {
        source: '/api/media/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Range, Authorization, Content-Type, Accept' },
          { key: 'Access-Control-Expose-Headers', value: 'Content-Length, Content-Range, Content-Type, Accept-Ranges' },
        ],
      },
      {
        source: '/media/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Range, Authorization, Content-Type, Accept' },
          { key: 'Access-Control-Expose-Headers', value: 'Content-Length, Content-Range, Content-Type, Accept-Ranges' },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['node:sqlite'],
  },
};

export default nextConfig;
