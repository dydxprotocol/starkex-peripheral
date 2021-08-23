import { HardhatUserConfig } from "hardhat/types";

import '@typechain/hardhat'
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

require('dotenv').config()

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        url: process.env.FORK as string,
        blockNumber: 10888007
      }
    }
  },
  solidity: {
    compilers: [{ version: "0.8.0", settings: { optimizer: {enabled: true, runs: 200} } }],
  },
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  },
};

export default config;
