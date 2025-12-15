import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 依存関係の最適化
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
  },
  build: {
    cssMinify: false,
    // より小さなチャンクサイズの目標
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // node_modulesから大きな依存関係を分離
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('react-window')) {
              return 'ui-vendor';
            }
            // その他のnode_modules
            return 'vendor';
          }
          // dataフォルダのファイルを分離
          if (id.includes('/src/data/')) {
            return 'data';
          }
        },
      },
    },
    // チャンクサイズの警告制限を上げる（一時的）
    chunkSizeWarningLimit: 1000,
    // ソースマップを無効化してビルド時間短縮
    sourcemap: false,
    // minifyの最適化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.logを削除
        drop_debugger: true,
      },
    },
  },
})
