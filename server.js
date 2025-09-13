// server.js (프로젝트 루트)
import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './backend/routes/api.js';
import { connectDB } from './backend/db.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
await connectDB();

// 2) React 빌드 결과물(정적 파일) 제공
const buildPath = path.join(__dirname, 'frontend', 'build');
app.use(express.static(buildPath));
app.use('/api', apiRouter);

// 3) SPA 대응: 그 외 모든 GET 요청은 index.html 로
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

console.log('✅ Catch-all route added');
console.log('✅ Contract OK');
console.log('✅ Timesheet OK');

// 4) 포트 5000에서 모든 인터페이스 바인딩
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
);