#!/usr/bin/env node

/**
 * Check Node.js and npm versions against minimum requirements
 */

const requiredNodeVersion = '18.0.0';
const requiredNpmVersion = '9.0.0';

function parseVersion(version) {
  return version.replace(/^v/, '').split('.').map(Number);
}

function compareVersions(current, required) {
  const currentParts = parseVersion(current);
  const requiredParts = parseVersion(required);

  for (let i = 0; i < 3; i++) {
    if (currentParts[i] > requiredParts[i]) return 1;
    if (currentParts[i] < requiredParts[i]) return -1;
  }
  return 0;
}

function checkVersions() {
  const nodeVersion = process.version;
  const npmVersion = require('child_process')
    .execSync('npm -v', { encoding: 'utf8' })
    .trim();

  console.log('\n🔍 Checking system requirements...\n');
  console.log(`Current Node.js version: ${nodeVersion}`);
  console.log(`Current npm version: ${npmVersion}\n`);

  let hasError = false;

  // Check Node.js version
  if (compareVersions(nodeVersion, requiredNodeVersion) < 0) {
    console.error(`❌ ERROR: Node.js version ${requiredNodeVersion} or higher is required.`);
    console.error(`   You are using ${nodeVersion}`);
    console.error(`   Please update Node.js: https://nodejs.org/\n`);
    hasError = true;
  } else {
    console.log(`✅ Node.js version ${nodeVersion} meets requirement (>=${requiredNodeVersion})`);
  }

  // Check npm version
  if (compareVersions(npmVersion, requiredNpmVersion) < 0) {
    console.error(`❌ ERROR: npm version ${requiredNpmVersion} or higher is required.`);
    console.error(`   You are using ${npmVersion}`);
    console.error(`   Please update npm: npm install -g npm@latest\n`);
    hasError = true;
  } else {
    console.log(`✅ npm version ${npmVersion} meets requirement (>=${requiredNpmVersion})`);
  }

  if (hasError) {
    console.error('\n❌ Version requirements not met. Please update and try again.\n');
    process.exit(1);
  }

  console.log('\n✅ All version requirements met!\n');
}

checkVersions();
