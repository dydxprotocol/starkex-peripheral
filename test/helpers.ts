import Web3 from 'web3';
import { DydxClient, EthereumAccount } from '@dydxprotocol/v3-client';
import { generateKeyPairUnsafe } from '@dydxprotocol/starkex-lib';
import axios, { AxiosRequestConfig } from 'axios';

export async function createUser() {
  const web3 = new Web3();
  const account: EthereumAccount = web3.eth.accounts.wallet.create(1)[0];
  const address: string = account.address.toLowerCase();

  const starkKeyPair = generateKeyPairUnsafe();

  const client = new DydxClient(
    process.env.V3_API_HOST as string,
    {
      starkPrivateKey: starkKeyPair,
      web3,
      networkId: 3,
    },
  );

  return client.onboarding.createUser(
    {
      starkKey: starkKeyPair.publicKey,
      starkKeyYCoordinate: starkKeyPair.publicKeyYCoordinate!,
    },
    address,
  );
}

export async function axiosRequest(options: AxiosRequestConfig): Promise<unknown> {
  const response = await axios(options);
  return response.data;
}

export function generateQueryPath(url: string, params: {}): string {
  const entries = Object.entries(params);
  if (!entries.length) {
    return url;
  }
  const paramsString = entries.map(
    (kv) => `${kv[0]}=${kv[1]}`,
  ).join('&');
  return `${url}?${paramsString}`;
}
