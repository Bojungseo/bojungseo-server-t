// ================================================================
// server.js — Google Sheets + Express + Token Auth (통합완성본)
// ================================================================

const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const crypto = require('crypto');
const path = require('path');

// =================================================================
// 환경설정
// =================================================================
const PORT = process.env.PORT || 4000;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');

const AUTH_SPREADSHEET_ID = '1yfPB1mhLnYP59SIRJNsPjiug-3glypQcB1zu4ODXQVs';
const PATIENT_SPREADSHEET_ID = '1R7sNFwF0g-_ii6wNxol3-1xBQUbxnioE3ST70REvpNM';
const PATIENT2_SPREADSHEET_ID = '1vsnRcJ4JxO3xwmecWX8pAd6Mr_Wpxf-eyzpkcxb9mBI';
const CONTACT_SPREADSHEET_ID = '14V02SniJzspB-nEYArxrCIEOwhClL3HC94qP8sWZA-s';
const STANDARD_SPREADSHEET_ID = '1_dCZkV8-Sun-xphkSi2qlN31Q5FvYQEEv70Mu7tadfA';

// =================================================================
// Google 인증 객체 생성
// =================================================================
const serviceAccountAuth = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ],
});

const authDoc = new GoogleSpreadsheet(AUTH_SPREADSHEET_ID, serviceAccountAuth);
const patientDoc = new GoogleSpreadsheet(PATIENT_SPREADSHEET_ID, serviceAccountAuth);
const patientDoc2 = new GoogleSpreadsheet(PATIENT2_SPREADSHEET_ID, serviceAccountAuth);
const contactDoc = new GoogleSpreadsheet(CONTACT_SPREADSHEET_ID, serviceAccountAuth);
const standardDoc = new GoogleSpreadsheet(STANDARD_SPREADSHEET_ID, serviceAccountAuth);

// =================================================================
// 캐싱
// =================================================================
let patientCache = [];
let patientCache2 = [];
let cachedContacts = { sonhae: [], saengmyeong: [], lastUpdated: null };
let standardCache = [];

// =================================================================
// Security: API Token 인증 시스템
// =================================================================
let activeTokens = new Set(); // 현재 로그인 토큰 저장

function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];

  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ message: '권한 없음: 유효한 인증 토큰이 필요합니다.' });
  }

  next();
}

// =================================================================
// 데이터 캐싱 함수들
// =================================================================
async function loadAndCachePatientData(doc, cacheArray) {
  try {
    const allPatients = [];
    if (!doc.title) await doc.loadInfo();

    for (const sheet of doc.sheetsByIndex) {
      const rows = await sheet.getRows();
      const sheetData = rows.map(row => ({
        ...row.toObject(),
        보험회사: sheet.title,
        id: crypto.randomUUID()
      }));
      allPatients.push(...sheetData);
    }

    if (cacheArray === patientCache) patientCache = allPatients;
    else patientCache2 = allPatients;

  } catch (error) {
    console.error('[환자 캐시 오류]', error);
  }
}

async function loadAndCacheContacts() {
  try {
    if (!contactDoc.title) await contactDoc.loadInfo();

    const sheet = contactDoc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const data = rows.map(r => r.toObject());

    const DIVIDER = 32;
    cachedContacts.sonhae = data.slice(0, DIVIDER);
    cachedContacts.saengmyeong = data.slice(DIVIDER);
    cachedContacts.lastUpdated = new Date().toISOString();

  } catch (err) {
    console.error('[연락망 캐시 오류]', err);
  }
}

async function loadAndCacheStandard() {
  try {
    if (!standardDoc.title) await standardDoc.loadInfo();
    const sheet = standardDoc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    standardCache = rows.map(row => {
      const obj = row.toObject();
      return {
        id: crypto.randomUUID(),
        병명: obj.병명 ?? '',
        성별: obj.성별 ?? '',
        나이: obj.나이 ?? '',
        보험회사: obj.보험회사 ?? '',
        상품종류: obj.상품종류 ?? '',
        보장내용: obj.보장내용 ?? '',
        심사결과: obj.심사결과 ?? '',
      };
    });

  } catch (err) {
    console.error('[standard 캐시 오류]', err);
  }
}

// =================================================================
// Express 설정
// =================================================================
const app = express();
app.use(cors());
app.use(express.json());

const frontendDistPath = path.join(__dirname, './dist');
app.use(express.static(frontendDistPath));

// =================================================================
// 1. 로그인 API — token 발급
// =================================================================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const sheet = authDoc.sheetsByTitle['users'];
    const rows = await sheet.getRows();
    const userRow = rows.find(r => r.get('username') === username);

    if (!userRow)
      return res.status(404).json({ message: '존재하지 않는 아이디입니다.' });

    if (userRow.get('password') !== password)
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

    // 🔥 토큰 발급
    const token = crypto.randomBytes(40).toString("hex");
    activeTokens.add(token);

    return res.status(200).json({
      success: true,
      token,
      user: {
        username,
        grade: userRow.get('grade'),
        본부: userRow.get('본부'),
        지사: userRow.get('지사')
      }
    });
  } catch (err) {
    return res.status(500).json({ message: '서버 오류', error: err });
  }
});

// =================================================================
// 2. 회원가입 요청 API
// =================================================================
app.post('/api/register', async (req, res) => {
  const { username, password, 본부, 지사 } = req.body;

  try {
    const sheet = authDoc.sheetsByTitle['requests'];
    await sheet.addRow({
      username,
      password,
      본부,
      지사,
      requestTime: new Date().toLocaleString('ko-KR'),
    });

    res.status(201).json({ message: '아이디 신청 완료' });
  } catch (err) {
    res.status(500).json({ message: '회원가입 오류', error: err });
  }
});

// =================================================================
// (관리자 전용 — 인증 필요)
// =================================================================
app.get('/api/requests', authMiddleware, async (req, res) => {
  const sheet = authDoc.sheetsByTitle['requests'];
  const rows = await sheet.getRows();
  res.json({ requests: rows.map(r => ({ ...r.toObject(), id: r.rowIndex })) });
});

app.post('/api/approve', authMiddleware, async (req, res) => {
  const { requestId } = req.body;

  const reqSheet = authDoc.sheetsByTitle['requests'];
  const userSheet = authDoc.sheetsByTitle['users'];
  const rows = await reqSheet.getRows();
  const row = rows.find(r => r.rowIndex === requestId);

  if (!row) return res.status(404).json({ message: '신청 없음' });

  await userSheet.addRow({
    username: row.get('username'),
    password: row.get('password'),
    grade: '일반 회원',
    본부: row.get('본부'),
    지사: row.get('지사')
  });

  await row.delete();

  res.json({ message: '승인 완료' });
});

app.get('/api/users', authMiddleware, async (req, res) => {
  const sheet = authDoc.sheetsByTitle['users'];
  const rows = await sheet.getRows();
  res.json({ users: rows.map(r => ({ ...r.toObject(), id: r.rowIndex })) });
});

// =================================================================
// 검색계 API (일반 사용 가능)
// =================================================================
app.get('/api/search-patients', async (req, res) => {
  const { keyword } = req.query;

  const results = keyword
    ? patientCache.filter(p => p.병명?.includes(keyword))
    : patientCache;

  res.json({ success: true, patients: results });
});

app.get('/api/search-patients-2', async (req, res) => {
  const { keyword } = req.query;

  const results = keyword
    ? patientCache2.filter(p => p.병명?.includes(keyword))
    : patientCache2;

  res.json({ success: true, patients: results });
});

app.get('/api/contacts', async (req, res) => {
  res.json({
    success: true,
    sonhae: cachedContacts.sonhae,
    saengmyeong: cachedContacts.saengmyeong,
    cachedAt: cachedContacts.lastUpdated
  });
});

app.get('/api/search-standard', async (req, res) => {
  const { keyword } = req.query;

  const results = keyword
    ? standardCache.filter(p => p.병명?.includes(keyword))
    : standardCache;

  res.json({ success: true, patients: results });
});

// =================================================================
// SPA 대응
// =================================================================
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ message: 'API Not Found' });
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// =================================================================
// 서버 시작
// =================================================================
async function startServer() {
  await Promise.all([
    authDoc.loadInfo(),
    patientDoc.loadInfo(),
    patientDoc2.loadInfo(),
    contactDoc.loadInfo(),
    standardDoc.loadInfo()
  ]);

  await loadAndCachePatientData(patientDoc, patientCache);
  await loadAndCachePatientData(patientDoc2, patientCache2);
  await loadAndCacheStandard();
  await loadAndCacheContacts();

  setInterval(loadAndCacheContacts, 180000);
  setInterval(loadAndCacheStandard, 600000);

  app.listen(PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  });
}

startServer();
