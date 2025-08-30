import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Validate required environment variables for production builds
  if (mode === 'production') {
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ]
    
    const missingVars = requiredEnvVars.filter(varName => !env[varName])
    
    if (missingVars.length > 0) {
      console.error('⚠️  Missing required environment variables for production build:')
      missingVars.forEach(varName => {
        console.error(`   ❌ ${varName}`)
      })
      console.error('\n📝 Please set these variables in your deployment platform:')
      console.error('   - Vercel: Project Settings → Environment Variables')
      console.error('   - Netlify: Site Settings → Environment Variables')
      console.error('   - Local: Create a .env file from .env.example\n')
      throw new Error(`Build failed: Missing required environment variables: ${missingVars.join(', ')}`)
    }
    
    // Validate Supabase URL format
    if (env.VITE_SUPABASE_URL && !env.VITE_SUPABASE_URL.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
      console.warn('⚠️  VITE_SUPABASE_URL may be incorrectly formatted.')
      console.warn('   Expected format: https://your-project-id.supabase.co')
      console.warn(`   Current value: ${env.VITE_SUPABASE_URL}`)
    }
    
    console.log('✅ Environment variables validated successfully')
    console.log(`   - Supabase URL: ${env.VITE_SUPABASE_URL}`)
    console.log(`   - Anon Key: ${env.VITE_SUPABASE_ANON_KEY ? '***' + env.VITE_SUPABASE_ANON_KEY.slice(-4) : 'Not set'}`)
    console.log(`   - Log Level: ${env.VITE_LOG_LEVEL || 'WARN (default)'}`)
    console.log(`   - Development Mode: ${env.VITE_DEVELOPMENT_MODE || 'false (default)'}`)
  }
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'production' ? 'hidden' : true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'ui-vendor': ['react-select', 'react-datepicker', 'react-calendar', 'react-toastify'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'yup', 'zod']
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.')
            const extType = info[info.length - 1]
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `assets/images/[name]-[hash][extname]`
            } else if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js'
        }
      },
      minify: mode === 'production' ? 'terser' : false,
      terserOptions: mode === 'production' ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js']
    }
  }
})