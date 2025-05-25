require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    bnbTestnet: {
      url: process.env.BNB_TESTNET_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    bnbMainnet: {
      url: process.env.BNB_MAINNET_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    opbnbTestnet: {
      url: process.env.OPBNB_TESTNET_RPC || "https://opbnb-testnet-rpc.bnbchain.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 5611
    },
    opbnbMainnet: {
      url: process.env.OPBNB_MAINNET_RPC || "https://opbnb-mainnet-rpc.bnbchain.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 204
    }
  }
};
