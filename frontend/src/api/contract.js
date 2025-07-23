// src/api/contract.js
import axios from 'axios';

export async function registerContract(cid, expiryTs) {
  const { data } = await axios.post('/api/register', { cid, expiryTs });
  return data.txHash;
}
