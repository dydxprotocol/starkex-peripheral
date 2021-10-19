import axios, { AxiosRequestConfig } from 'axios';
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

export function starkKeyToUint256(
  starkKey: string,
): string {
  return new BigNumber(starkKey, 16).toFixed(0);
}
