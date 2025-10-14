// backend/utils/pinata.js
import axios from "axios";
import FormData from "form-data";

export async function pinFileToIPFS(filename, buffer) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  const form = new FormData();
  form.append("file", buffer, { filename });

  try {
    const res = await axios.post(url, form, {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      timeout: 30000,
    });
    if (!res.data?.IpfsHash) {
      throw new Error('Pinata response missing IpfsHash');
    }
    return res.data.IpfsHash;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const hint = status ? `status=${status}` : '';
    const detail = data ? `, detail=${JSON.stringify(data).slice(0,500)}` : '';
    throw new Error(`Pinata upload failed ${hint}${detail}`);
  }
}
