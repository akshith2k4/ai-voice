import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import JavaScriptObfuscator from 'javascript-obfuscator'

const SKIP_OBFUSCATION = /vendor-|lodash|BarChart|DateTimePicker|useMobilePicker/

function obfuscatorPlugin() {
  const obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.3,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.1,
    debugProtection: true,
    debugProtectionInterval: 2000,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 1,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 2,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
  }

  return {
    name: 'vite-obfuscator',
    order: 'post',
    generateBundle(_, bundle) {
      for (const [key, chunk] of Object.entries(bundle)) {
        if (key.endsWith('.js') && chunk.type === 'chunk' && !SKIP_OBFUSCATION.test(key)) {
          const result = JavaScriptObfuscator.obfuscate(chunk.code, obfuscatorOptions)
          chunk.code = result.getObfuscatedCode()
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    obfuscatorPlugin(),
  ],
  define: {
    global: "window",
  },
  server: {
    host: true,
    port: 3000,
    plugins: [react()],
    base: '/',
  },
  build: {
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': [
            '@mui/material',
            '@mui/icons-material',
            '@mui/lab',
            '@emotion/react',
            '@emotion/styled',
          ],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-utils': ['axios', 'date-fns', 'yup', 'react-hook-form'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
