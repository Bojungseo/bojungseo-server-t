// ================================================================
// server.js (Docker + Vite + Express + Google Sheets 통합 버전)
// ================================================================

const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const PORT = process.env.PORT || 4000;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');

const AUTH_SPREADSHEET_ID = '1yfPB1mhLnYP59SIRJNsPjiug-3glypQcB1zu4ODXQVs';
const PATIENT_SPREADSHEET_ID = '1R7sNFwF0g-_ii6wNxol3-1xBQUbxnioE3ST70REvpNM';
const PATIENT2_SPREADSHEET_ID = '1vsnRcJ4JxO3xwmecWX8pAd6Mr_Wpxf-eyzpkcxb9mBI';
const CONTACT_SPREADSHEET_ID = '14V02SniJzspB-nEYArxrCIEOwhClL3HC94qP8sWZA-s';

const serviceAccountAuth = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
});

const authDoc = new GoogleSpreadsheet(AUTH_SPREADSHEET_ID, serviceAccountAuth);
const patientDoc = new GoogleSpreadsheet(PATIENT_SPREADSHEET_ID, serviceAccountAuth);
const patientDoc2 = new GoogleSpreadsheet(PATIENT2_SPREADSHEET_ID, serviceAccountAuth);
const contactDoc = new GoogleSpreadsheet(CONTACT_SPREADSHEET_ID, serviceAccountAuth);

// ================================================================
// 데이터 캐싱
// ================================================================
let patientCache = [];
let patientCache2 = [];
let cachedContacts = { sonhae: [], saengmyeong: [] };

async function loadAndCachePatientData(doc, cacheArray) {
  try {
    const allPatients = [];
    if (!doc.title) await doc.loadInfo();
    for (const sheet of doc.sheetsByIndex) {
      const rows = await sheet.getRows();
      const sheetData = rows.map(row => ({ ...row.toObject(), 보험회사: sheet.title, id: crypto.randomUUID() }));
      allPatients.push(...sheetData);
    }
    if (cacheArray === patientCache) patientCache = allPatients;
    else patientCache2 = allPatients;
    console.log(`✅ ${doc.title} 캐시 완료 (${allPatients.length}건)`);
  } catch (err) {
    console.error(`[캐싱 오류] ${doc.title}:`, err);
  }
}

async function loadAndCacheContacts() {
  try {
    if (!contactDoc.title) await contactDoc.loadInfo();
    const sheet = contactDoc.sheetsByIndex[0];
    const rowCount = sheet.rowCount;
    const colCount = sheet.columnCount;

    await sheet.loadCells({ startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: colCount });
    await sheet.loadCells({ startRowIndex: 3, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount });

    const headers = [];
    for (let j = 0; j < colCount; j++) {
      headers.push(sheet.getCell(2, j).value?.toString().trim() || '');
    }

    const allContacts = [];
    for (let i = 3; i < rowCount; i++) {
      const rowObj = {};
      let emptyRow = true;
      for (let j = 0; j < colCount; j++) {
        const value = sheet.getCell(i, j).value;
        if (value && value.toString().trim() !== '') emptyRow = false;
        rowObj[headers[j]] = value;
      }
      if (!emptyRow) allContacts.push(rowObj);
    }

    const DIVIDE_ROW_INDEX = 32;
    cachedContacts.sonhae = allContacts.slice(0, DIVIDE_ROW_INDEX - 3);
    cachedContacts.saengmyeong = allContacts.slice(DIVIDE_ROW_INDEX - 3);

    console.log(`[Contacts] 캐시 완료 (손해: ${cachedContacts.sonhae.length}, 생명: ${cachedContacts.saengmyeong.length})`);
  } catch (err) {
    console.error('[Contacts] 캐싱 중 오류 발생:', err);
  }
}

// ================================================================
// Express 설정
// ================================================================
const app = express();
app.use(cors());
app.use(express.json());

const frontendDistPath = path.join(__dirname, './dist');
app.use(express.static(frontendDistPath));

// ================================================================
// API 라우트 (로그인/회원가입/검색 등)
// ================================================================
app.post('/api/login', async (req, res) => { /* 기존 로그인 코드 */ });
app.post('/api/register', async (req, res) => { /* 기존 회원가입 코드 */ });
app.get('/api/requests', async (req, res) => { /* 기존 승인 요청 조회 */ });
app.post('/api/approve', async (req, res) => { /* 기존 승인 */ });
app.post('/api/reject', async (req, res) => { /* 기존 거절 */ });
app.get('/api/users', async (req, res) => { /* 기존 사용자 조회 */ });
app.post('/api/update-user', async (req, res) => { /* 기존 사용자 업데이트 */ });
app.post('/api/delete-user', async (req, res) => { /* 기존 사용자 삭제 */ });
app.get('/api/search-patients', async (req, res) => { /* 기존 조건 검색 1 */ });
app.get('/api/search-patients-2', async (req, res) => { /* 기존 조건 검색 2 */ });

// ================================================================
// ✨ 원수사 연락망 API (캐시 사용)
// ================================================================
app.get('/api/contacts', (req, res) => {
  try {
    res.json({
      success: true,
      sonhae: cachedContacts.sonhae,
      saengmyeong: cachedContacts.saengmyeong
    });
  } catch (err) {
    console.error('[Backend] 원수사 연락망 API 오류:', err);
    res.status(500).json({ success: false, message: '원수사 연락망 조회 중 오류 발생' });
  }
});

// ================================================================
// SPA fallback
// ================================================================
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) return next();
  res.sendFile(path.resolve(frontendDistPath, 'index.html'));
});

// ================================================================
// 서버 시작
// ================================================================
async function startServer() {
  try {
    await Promise.all([authDoc.loadInfo(), patientDoc.loadInfo(), patientDoc2.loadInfo()]);
    console.log('✅ Google Sheets 연결 완료');

    await loadAndCachePatientData(patientDoc, patientCache);
    await loadAndCachePatientData(patientDoc2, patientCache2);

    await loadAndCacheContacts();
    setInterval(loadAndCacheContacts, 3 * 60 * 1000); // 3분마다 갱신

    app.listen(PORT, () => {
      console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ 서버 시작 중 오류:', err);
    process.exit(1);
  }
}

startServer();
