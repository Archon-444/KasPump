import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    kasplex: {
      url: "https://rpc.kasplex.io",
      chainId: 167012,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
    kasplexTest: {
      url: "https://rpc.kasplextest.xyz", 
      chainId: 167012,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    }
  },
  etherscan: {
    apiKey: {
      kasplex: "no-api-key-needed" // Kasplex doesn't require API key
    },
    customChains: [
      {
        network: "kasplex",
        chainId: 167012,
        urls: {
          apiURL: "https://explorer.kasplex.io/api",
          browserURL: "https://explorer.kasplex.io"
        }
      }
    ]
  }
};

export default config;
