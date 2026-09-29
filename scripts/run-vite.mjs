/**
 * Project-local Vite entry.
 * npm run build/dev/preview must not resolve a parent-workspace Vite.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { ensureEsbuild, localPackage, root } from './project-toolchain.mjs';

const vite = localPackage('vite');
const react = localPackage('react');
const esbuildPkg = localPackage('esbuild');
const esbuildBin = ensureEsbuild(esbuildPkg.pkg.version);
const viteBin = path.join(vite.root, 'bin', 'vite.js');
const args = process.argv.slice(2);

const child = spawnSync(process.execPath, [viteBin, ...args], {
  cwd: root,
  env: { ...process.env, ESBUILD_BINARY_PATH: esbuildBin },
  encoding: 'utf8',
});

process.stdout.write(child.stdout || '');
process.stderr.write(child.stderr || '');
if (child.status !== 0) process.exit(child.status ?? 1);

if (args[0] === 'build') {
  const output = `${child.stdout || ''}${child.stderr || ''}`;
  const modules = output.match(/(\d+)\s+modules transformed/);
  const js = output.match(/dist\/assets\/(index-[^.\s]+\.js)/);
  const css = output.match(/dist\/assets\/(index-[^.\s]+\.css)/);
  console.log('BUILD IDENTITY');
  console.log(`vite: ${vite.pkg.version} (${path.relative(root, vite.root)})`);
  console.log(`react: ${react.pkg.version} (${path.relative(root, react.root)})`);
  console.log(`modules: ${modules ? modules[1] : 'unknown'}`);
  console.log(`js: ${js ? js[1] : 'unknown'}`);
  console.log(`css: ${css ? css[1] : 'unknown'}`);
  console.log(`esbuild: ${path.relative(root, esbuildBin)}`);
}
