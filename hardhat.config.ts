import { HardhatUserConfig, HttpNetworkUserConfig } from "hardhat/types";

import fs from 'fs';
import path from 'path';

import "solidity-coverage"
import '@typechain/hardhat'
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import { NetworkName } from "./tasks/helpers/types";

require('dotenv').config()

const MNEMONIC = process.env.MNEMONIC || '';
const MNEMONIC_PATH = "m/44'/60'/0'/0";

// Should be set when running hardhat compile or hardhat typechain.
const SKIP_LOAD = process.env.SKIP_LOAD === 'true';

// Load hardhat tasks.
if (!SKIP_LOAD) {
  console.log('Loading scripts...');
  const tasksDir = path.join(__dirname, 'tasks');
  const tasksDirs = fs.readdirSync(tasksDir);
  tasksDirs.forEach((dirName) => {
    const tasksDirPath = path.join(tasksDir, dirName);
    const tasksFiles = fs.readdirSync(tasksDirPath);
    tasksFiles.forEach((fileName) => {
      const tasksFilePath = path.join(tasksDirPath, fileName);
      /* eslint-disable-next-line global-require */
      require(tasksFilePath);
    });
  });
}

function getRemoteNetworkConfig(
  networkName: NetworkName,
  networkId: number,
): HttpNetworkUserConfig {
  return {
    url: `https://eth-${networkName}.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    chainId: networkId,
    accounts: {
      mnemonic: MNEMONIC,
      path: MNEMONIC_PATH,
      initialIndex: 0,
      count: 10,
    },
  };
}


const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      }
    },
    goerli: getRemoteNetworkConfig(NetworkName.goerli, 5),
    ropsten: getRemoteNetworkConfig(NetworkName.ropsten, 3),
    sepolia: getRemoteNetworkConfig(NetworkName.sepolia, 11155111),
    mainnet: getRemoteNetworkConfig(NetworkName.mainnet, 1),
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
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  }
};

export default config;
