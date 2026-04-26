import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],







  base: './',

  optimizeDeps: {
     include: [
        'react-window', 
        'react-virtualized-auto-sizer', 
        'react-window-infinite-loader'
     ]
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    commonjsOptions: {
       transformMixedEsModules: true,
       include: [
           /react-window/, 
           /react-virtualized-auto-sizer/, 
           /react-window-infinite-loader/
       ]
    },

    rollupOptions: {
      output: {

        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
