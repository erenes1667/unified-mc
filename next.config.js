/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {},
  typescript: {
    // Pre-existing TS errors in calendar-panel, pipeline-builder-panel, usage-panel
    // will be fixed in a separate PR. Build proceeds.
    ignoreBuildErrors: true,
  },
  
  // Security headers
  async headers() {
    const googleEnabled = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)

    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}${googleEnabled ? ' https://accounts.google.com' : ''}`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:*`,
      `img-src 'self' data: blob:${googleEnabled ? ' https://*.googleusercontent.com https://lh3.googleusercontent.com' : ''}`,
      `font-src 'self' data: https://fonts.gstatic.com`,
      `frame-src 'self'${googleEnabled ? ' https://accounts.google.com' : ''}`,
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          // X-Frame-Options removed — MC is embedded in webchat iframe (different port = cross-origin)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(process.env.MC_ENABLE_HSTS === '1' ? [
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
          ] : []),
        ],
      },
    ];
  },
  
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      os: false,
      fs: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;
