// ================================================================
// server.js (Docker + Vite + Express + Google Sheets 완전 통합 버전)
// ================================================================

const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// --- 설정 ---
const PORT = process.env.PORT || 4000;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');
const AUTH_SPREADSHEET_ID = '1yfPB1mhLnYP59SIRJNsPjiug-3glypQcB1zu4ODXQVs';
const PATIENT_SPREADSHEET_ID = '1R7sNFwF0g-_ii6wNxol3-1xBQUbxnioE3ST70REvpNM';
const PATIENT2_SPREADSHEET_ID = '1vsnRcJ4JxO3xwmecWX8pAd6Mr_Wpxf-eyzpkcxb9mBI';
const CONTACT_SPREADSHEET_ID = '14V02SniJzspB-nEYArxrCIEOwhClL3HC94qP8sWZA-s';

// --- 구글 시트 인증 ---
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

// =================================================================
// 데이터 캐싱 로직 (환자 정보)
// =================================================================
let patientCache = [];
let patientCache2 = [];

async function loadAndCachePatientData(doc, cacheArray) {
  const cacheName = (cacheArray === patientCache) ? '1차 캐시' : '2차 캐시';
  try {
    const allPatients = [];
    if (!doc.title) await doc.loadInfo();

    for (const sheet of doc.sheetsByIndex) {
      console.log(`  -> "${sheet.title}" 시트 데이터 읽는 중...`);
      const rows = await sheet.getRows();
      const sheetData = rows.map(row => ({
        ...row.toObject(),
        보험회사: sheet.title,
        id: crypto.randomUUID(),
      }));
      allPatients.push(...sheetData);
      console.log(`  ✅ "${sheet.title}" 시트에서 ${sheetData.length}건 캐싱 완료.`);
    }

    if (cacheArray === patientCache) {
      patientCache = allPatients;
    } else {
      patientCache2 = allPatients;
    }

    console.log(`✅ ${cacheName} 최종 완료. 총 ${allPatients.length}건.`);
  } catch (error) {
    console.error(`❌ ${cacheName} 중 오류 발생:`, error);
    throw error;
  }
}

// =================================================================
// ✨ 원수사 연락망 캐싱 로직 추가
// =================================================================
let contactCache = { sonhae: [], saengmyeong: [], lastUpdated: null }; // ✨

async function loadAndCacheContacts() { // ✨
  console.log('🔄 [Cache] 원수사 연락망 데이터 새로 갱신 중...');
  try {
    await contactDoc.loadInfo();
    const sheet = contactDoc.sheetsByIndex[0];

    const rowCount = sheet.rowCount;
    const colCount = sheet.columnCount;

    await sheet.loadCells({ startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: colCount });
    await sheet.loadCells({ startRowIndex: 3, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount });

    const headers = [];
    for (let j = 0; j < colCount; j++) {
      const headerValue = sheet.getCell(2, j).value;
      headers.push(headerValue ? headerValue.toString().trim() : '');
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
    const sonhae = allContacts.slice(0, DIVIDE_ROW_INDEX - 3);
    const saengmyeong = allContacts.slice(DIVIDE_ROW_INDEX - 3);

    contactCache = {
      sonhae,
      saengmyeong,
      lastUpdated: new Date().toISOString()
    };

    console.log(`✅ [Cache] 원수사 연락망 캐시 완료 (${sonhae.length + saengmyeong.length}건)`);
  } catch (error) {
    console.error('❌ [Cache] 원수사 연락망 갱신 중 오류:', error);
  }
}

// ✨ 3분마다 자동 갱신 (180초)
setInterval(() => {
  loadAndCacheContacts();
}, 3 * 60 * 1000);

// =================================================================
// Express 앱 설정 및 API 라우트
// =================================================================
const app = express();
app.use(cors());
app.use(express.json());

// ================================================================
// 프론트엔드 정적 파일 서빙
// ================================================================
const frontendDistPath = path.join(__dirname, './dist');
app.use(express.static(frontendDistPath));

// --- 로그인 / 회원가입 / 관리자 API (생략, 기존 코드 동일) ---
// ... [중간 생략: 기존 API 코드 유지] ...

// --- 11. (수정됨) 원수사 연락망 API --- ✨
app.get('/api/contacts', async (req, res) => {
  try {
    if (!contactCache.sonhae.length && !contactCache.saengmyeong.length) {
      console.log('⚠️ [Cache Miss] 원수사 연락망 데이터가 캐시에 없어, 즉시 로드 중...');
      await loadAndCacheContacts();
    }

    res.status(200).json({
      success: true,
      cachedAt: contactCache.lastUpdated,
      sonhae: contactCache.sonhae,
      saengmyeong: contactCache.saengmyeong
    });
  } catch (error) {
    console.error('[Backend] 원수사 연락망 조회 중 오류:', error);
    res.status(500).json({ success: false, message: '원수사 연락망 조회 중 오류 발생' });
  }
});

// ✅ 모든 API 라우트 이후에 위치해야 함
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) return next();
  res.sendFile(path.resolve(frontendDistPath, 'index.html'));
});

// =================================================================
// 서버 시작
// =================================================================
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function startServer() {
  try {
    await Promise.all([authDoc.loadInfo(), patientDoc.loadInfo(), patientDoc2.loadInfo()]);
    console.log(`✅ 사용자 DB 시트 "${authDoc.title}" 연결됨`);
    console.log(`✅ 환자 1차 DB "${patientDoc.title}" 연결됨`);
    console.log(`✅ 환자 2차 DB "${patientDoc2.title}" 연결됨`);

    const memoryBefore = process.memoryUsage().heapUsed;
    console.log(`[Memory] 캐싱 전 힙 메모리: ${formatBytes(memoryBefore)}`);

    await loadAndCachePatientData(patientDoc, patientCache);
    await loadAndCachePatientData(patientDoc2, patientCache2);
    await loadAndCacheContacts(); // ✨ 서버 시작 시 원수사 연락망 초기 캐싱

    const memoryAfter = process.memoryUsage().heapUsed;
    console.log(`[Memory] 캐싱 후 힙 메모리: ${formatBytes(memoryAfter)}`);

    app.listen(PORT, () => {
      console.log('-------------------------------------------');
      console.log(`✅ API 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
      console.log('-------------------------------------------');
    });
  } catch (error) {
    console.error("❌ 서버 시작 중 오류 발생:", error);
    process.exit(1);
  }
}

startServer();
