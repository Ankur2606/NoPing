import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load ABI with correct path resolution
const abiPath = path.resolve(__dirname, "../artifacts/contracts/PaymentProcessor.sol/PaymentProcessor.json");
try {
  const abiJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const abi = abiJson.abi;

  // 2. Contract address & testnet RPC URL
  const contractAddress = "0x7BBB1ff2D99de75Ddaa5bBbb0892763c708606c2";
  const testnetRpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545/"; // BSC Testnet RPC

  async function listFunctions() {
    // 3. Connect to provider
    const provider = new ethers.providers.JsonRpcProvider(testnetRpcUrl);

    // 4. Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // 5. List functions
    console.log("Functions available in the contract:");
    abi.forEach((item) => {
      if (item.type === "function") {
        console.log(`- ${item.name}(${item.inputs.map(i => i.type).join(", ")})`);
      }
    });
  }

  listFunctions().catch(console.error);
} catch (error) {
  console.error("Failed to load ABI:", error.message);
  console.log("Make sure you've compiled your contracts with 'npx hardhat compile' first.");
  process.exit(1);
}
