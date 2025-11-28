import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/proxy/srt': {
          target: 'http://down.wjthinkbig.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/srt/, ''),
        },
        '/proxy/hls': {
          target: 'http://hlsmedia.wjthinkbig.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/hls/, ''),
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
