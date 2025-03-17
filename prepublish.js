#!/usr/bin/env node

const fs = require('fs').promises;

/**
 * Moves a file or directory from source to destination.
 * Logs the operation and errors if they occur.
 * @param {string} src - The source path.
 * @param {string} dest - The destination path.
 */
async function move(src, dest) {
  try {
    console.log(`Moving ${src} -> ${dest}`);
    await fs.rename(src, dest);
  } catch (error) {
    console.error(`Error moving ${src} to ${dest}: ${error.message}`);
  }
}

/**
 * Removes a file or directory from source path.
 * Logs the operation and errors if they occur.
 * @param {string} src - The source path.
 */
async function rm(src) {
  try {
    console.log(`Removing ${src}`);
    await fs.rm(src);
  } catch (error) {
    console.error(`Error removing ${src}: ${error.message}`);
  }
}

async function main() {
  await move('packages/react-lib/package.json', 'packages/react-lib/_package.json');
  await move('packages/react-lib/package-lock.json', 'packages/react-lib/_package.json');
  await move('packages/react-lib/.storybook', 'packages/react-lib/__storybook');
  await move('packages/react-lib/.eslintrc', 'packages/react-lib/__eslintrc');
  await move('packages/react-lib/.gitignore', 'packages/react-lib/__gitignore');
  await move('packages/react-lib/.npmignore', 'packages/react-lib/__npmignore');
  await rm('packages/react-lib/.git');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});