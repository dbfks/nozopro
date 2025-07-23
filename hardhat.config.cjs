require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');   // toolbox 하나만 import

module.exports = {
  solidity: '0.8.28',
  networks: {
    sepolia: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
