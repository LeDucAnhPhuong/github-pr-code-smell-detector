import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/action.ts'],
  format: ['esm'],
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  bundle: true,
  splitting: false,
  sourcemap: false,
  clean: false,
  dts: false,
  noExternal: [/.*/],
})
