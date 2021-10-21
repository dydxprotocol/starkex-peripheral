import { getNetworkName, hardhatTask } from '../helpers/hre';
import { deployProxyDeposit } from '../migrations/deployProxyDeposit';

hardhatTask('deploy-proxy-deposit', 'deploy proxy deposit contract')
.setAction(async () => {
  await deployProxyDeposit(getNetworkName());
});

module.exports = {};
