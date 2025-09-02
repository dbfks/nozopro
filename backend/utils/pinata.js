// backend/utils/pinata.js
import axios from "axios";
import FormData from "form-data";

export async function pinFileToIPFS(filename, buffer) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  const form = new FormData();
  form.append("file", buffer, { filename });

  const res = await axios.post(url, form, {
    headers: {
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_API_SECRET,
      ...form.getHeaders(),
    },
    maxBodyLength: Infinity,
  });
  return res.data?.IpfsHash;
}
