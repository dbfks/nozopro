import 'dotenv/config';
import PinataSDK from '@pinata/sdk';
import fs from 'fs';
import streamifier from 'streamifier';

async function main() {
  const key = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_API_SECRET;
  if (!key || !secret) {
    throw new Error('PINATA_API_KEY/PINATA_API_SECRET 설정이 필요합니다.');
  }

  // ① Pinata 클라이언트 생성
  const pinata = new PinataSDK(key, secret);

  // ② 업로드할 파일 읽기 (contract.pdf)
  const data = await fs.promises.readFile('./contract.pdf');
  const readStream = streamifier.createReadStream(data);

  // ③ Pinata에 파일 핀(pin)
  const result = await pinata.pinFileToIPFS(readStream, {
   pinataMetadata: {
     name: 'contract.pdf'    // 파일 이름
   }
 });
  console.log('✅ 업로드된 CID:', result.IpfsHash);
}

main().catch(console.error);
