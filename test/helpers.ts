import axios, { AxiosRequestConfig } from 'axios';
import { ethers } from 'hardhat'
import BigNumber from 'bignumber.js';


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

export function encode(address: string, callData: string): string {
  const encodedAddress = ethers.utils.defaultAbiCoder.encode(
    ['address'],
    [address],
  );
  return combineHexStrings(encodedAddress, callData);
}

function combineHexStrings(...args: string[]): string {
  return `0x${args.map(stripHexPrefix).join('')}`;
}

function stripHexPrefix(input: string) {
  if (input.startsWith('0x')) {
    return input.slice(2);
  }
  return input;
}

export function starkKeyToUint256(
  starkKey: string,
): string {
  return new BigNumber(starkKey, 16).toFixed(0);
}
