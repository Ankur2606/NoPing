#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

/**
 * This script starts a local Hardhat node and deploys contracts to it.
 * It's a convenient way to start development with a clean blockchain state.
 */

console.log('🚀 Starting FlowSync BNB Smart Chain Development Environment');

// Path to project directory
const projectDir = __dirname;

// Start Hardhat node
console.log('\n📡 Starting local Hardhat blockchain...');
const nodeProcess = spawn('npx', ['hardhat', 'node'], {
  cwd: projectDir,
  shell: true
});

// Keep track of successful node start
let nodeStarted = false;

// Handle node output
nodeProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[BLOCKCHAIN]: ${output}`);
  
  // When we detect a started node, deploy contracts
  if (output.includes('Started HTTP and WebSocket JSON-RPC server at') && !nodeStarted) {
    nodeStarted = true;
    console.log('\n⛓ Blockchain node running! Deploying contracts...');
    
    // Wait a moment to ensure node is ready
    setTimeout(() => {
      deployContracts();
    }, 2000);
  }
});

// Handle node errors
nodeProcess.stderr.on('data', (data) => {
  console.error(`[BLOCKCHAIN ERROR]: ${data}`);
});

// Handle node close
nodeProcess.on('close', (code) => {
  console.log(`\n💀 Blockchain process exited with code ${code}`);
  process.exit(code);
});

// Deploy contracts to local node
function deployContracts() {
  console.log('\n📄 Deploying contracts to local blockchain...');
  
  const deployProcess = spawn('npx', ['hardhat', 'run', './scripts/deploy.js', '--network', 'localhost'], {
    cwd: projectDir,
    shell: true
  });
  
  // Handle deploy output
  deployProcess.stdout.on('data', (data) => {
    console.log(`[DEPLOY]: ${data}`);
  });
  
  // Handle deploy errors
  deployProcess.stderr.on('data', (data) => {
    console.error(`[DEPLOY ERROR]: ${data}`);
  });
  
  // Handle deploy close
  deployProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Contracts deployed successfully!');
      console.log('\n🧪 To run test payments:');
      console.log('   In a new terminal, run: cd /Users/ayushmanlakshkar/Documents/flow-gen-sync/test-environment && npx hardhat run ./scripts/test-payments.js --network localhost');
      console.log('\n💻 Ready for development!');
      console.log('   Use Metamask with RPC URL: http://localhost:8545');
      console.log('   ChainID: 31337');
    } else {
      console.error(`\n❌ Contract deployment failed with code ${code}`);
    }
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping development environment...');
  nodeProcess.kill();
  process.exit(0);
});
