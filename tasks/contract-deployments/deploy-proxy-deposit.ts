import { getNetworkName, hardhatTask } from '../helpers/hre';
import { deployProxyDeposit } from '../migrations/deploy-proxy-deposit';

hardhatTask('deploy-proxy-deposit', 'deploy proxy deposit contract')
.setAction(async () => {
  await deployProxyDeposit(getNetworkName());
});
