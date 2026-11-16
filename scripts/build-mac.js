#!/usr/bin/env node
/**
 * build-mac.js - Native macOS .app, .dmg, and .zip Release Builder for mac-cleaner
 *
 * Uses macOS native tools (ditto, plutil, codesign, hdiutil) and the local
 * Electron.app binary to produce a self-contained, ad-hoc signed macOS application
 * bundle, a Drag-to-Applications .dmg installer, and a .zip release archive.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT_DIR, 'package.json'));
const VERSION = pkg.version || '1.1.0';
const ARCH = process.arch === 'arm64' ? 'arm64' : 'x64';
const APP_NAME = 'mac-cleaner';

const ELECTRON_APP_SRC = path.join(ROOT_DIR, 'node_modules/electron/dist/Electron.app');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const APP_BUNDLE_PATH = path.join(DIST_DIR, `${APP_NAME}.app`);
const DMG_STAGING_DIR = path.join(DIST_DIR, 'dmg-staging');
const DMG_OUTPUT_PATH = path.join(DIST_DIR, `${APP_NAME}-${VERSION}-macOS-${ARCH}.dmg`);
const ZIP_OUTPUT_PATH = path.join(DIST_DIR, `${APP_NAME}-${VERSION}-macOS-${ARCH}.zip`);

function run(cmd) {
  console.log(`  → ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR });
}

function build() {
  console.log(`\n🚀 Building ${APP_NAME} v${VERSION} (${ARCH}) for macOS...\n`);

  if (!fs.existsSync(ELECTRON_APP_SRC)) {
    console.error('❌ Error: Electron.app not found in node_modules. Run "npm install" first.');
    process.exit(1);
  }

  // 1. Clean & prepare dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // 2. Clone Electron.app preserving macOS framework symlinks via ditto
  console.log('📦 [1/6] Cloning native Electron.app bundle...');
  run(`ditto "${ELECTRON_APP_SRC}" "${APP_BUNDLE_PATH}"`);

  // 3. Copy application files into Contents/Resources/app
  console.log('📂 [2/6] Copying application sources & assets...');
  const resourcesDir = path.join(APP_BUNDLE_PATH, 'Contents/Resources');
  const appResourcesDir = path.join(resourcesDir, 'app');
  if (fs.existsSync(appResourcesDir)) {
    fs.rmSync(appResourcesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(appResourcesDir, { recursive: true });

  const filesToCopy = ['main.js', 'preload.js', 'server.js', 'package.json', 'LICENSE', 'README.md'];
  for (const file of filesToCopy) {
    const src = path.join(ROOT_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(appResourcesDir, file));
    }
  }

  run(`ditto "${path.join(ROOT_DIR, 'assets')}" "${path.join(appResourcesDir, 'assets')}"`);
  run(`ditto "${path.join(ROOT_DIR, 'src')}" "${path.join(appResourcesDir, 'src')}"`);

  // Copy production node_modules (exclude electron & .bin)
  const targetNodeModules = path.join(appResourcesDir, 'node_modules');
  fs.mkdirSync(targetNodeModules, { recursive: true });
  const nmEntries = fs.readdirSync(path.join(ROOT_DIR, 'node_modules'));
  for (const entry of nmEntries) {
    if (entry === 'electron' || entry === '.bin' || entry === '.cache' || entry.startsWith('@electron')) {
      continue;
    }
    const srcMod = path.join(ROOT_DIR, 'node_modules', entry);
    const dstMod = path.join(targetNodeModules, entry);
    run(`ditto "${srcMod}" "${dstMod}"`);
  }

  // 4. Replace app icon (.icns) and update Info.plist
  console.log('🎨 [3/6] Applying macOS squircle icon and Info.plist metadata...');
  const iconSrc = path.join(ROOT_DIR, 'assets/icon.icns');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(resourcesDir, 'electron.icns'));
  }

  const infoPlist = path.join(APP_BUNDLE_PATH, 'Contents/Info.plist');
  run(`plutil -replace CFBundleDisplayName -string "${APP_NAME}" "${infoPlist}"`);
  run(`plutil -replace CFBundleName -string "${APP_NAME}" "${infoPlist}"`);
  run(`plutil -replace CFBundleIdentifier -string "com.ozkandev.maccleaner" "${infoPlist}"`);
  run(`plutil -replace CFBundleShortVersionString -string "${VERSION}" "${infoPlist}"`);
  run(`plutil -replace CFBundleVersion -string "${VERSION}" "${infoPlist}"`);
  run(`plutil -replace LSApplicationCategoryType -string "public.app-category.utilities" "${infoPlist}"`);

  // 5. Ad-hoc sign the bundle so Apple Silicon runs it cleanly
  console.log('🔐 [4/6] Signing macOS app bundle (ad-hoc codesign)...');
  try {
    run(`codesign --force --deep --sign - "${APP_BUNDLE_PATH}"`);
  } catch (e) {
    console.warn('⚠️ Ad-hoc codesign warning (continuing):', e.message);
  }

  // 6. Create .zip release archive via ditto
  console.log('🗜️  [5/6] Creating macOS Release .zip archive...');
  run(`ditto -c -k --sequesterRsrc --keepParent "${APP_BUNDLE_PATH}" "${ZIP_OUTPUT_PATH}"`);

  // 7. Create .dmg installer image (if hdiutil is permitted in current environment)
  console.log('💿 [6/6] Creating macOS Drag-to-Applications .dmg installer...');
  try {
    fs.mkdirSync(DMG_STAGING_DIR, { recursive: true });
    run(`ditto "${APP_BUNDLE_PATH}" "${path.join(DMG_STAGING_DIR, `${APP_NAME}.app`)}"`);
    fs.symlinkSync('/Applications', path.join(DMG_STAGING_DIR, 'Applications'));
    run(`hdiutil create -volname "${APP_NAME}" -srcfolder "${DMG_STAGING_DIR}" -ov -format UDZO "${DMG_OUTPUT_PATH}"`);
    fs.rmSync(DMG_STAGING_DIR, { recursive: true, force: true });
  } catch (dmgErr) {
    if (fs.existsSync(DMG_STAGING_DIR)) {
      fs.rmSync(DMG_STAGING_DIR, { recursive: true, force: true });
    }
    console.warn('⚠️ Note: hdiutil requires running outside sandbox to mount virtual disk image.');
  }

  console.log('\n✅ Build finished successfully! Artifacts in dist/:');
  for (const f of fs.readdirSync(DIST_DIR)) {
    const p = path.join(DIST_DIR, f);
    const stat = fs.statSync(p);
    const mb = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`   • ${f} ${stat.isDirectory() ? '(App Bundle)' : `(${mb} MB)`}`);
  }
}

build();
