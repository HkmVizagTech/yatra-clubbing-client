import type { NextConfig } from 'next';

const config: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
      ],
    };
  },
};

export default config;
