import { getNetworkName, hardhatTask } from '../hre';
import { deployProxyDeposit } from '../migrations/deployProxyDeposit';

hardhatTask('deployProxyDeposit', 'deploy proxy deposit contract')
.setAction(async () => {
  await deployProxyDeposit(getNetworkName());
});

  module.exports = {};