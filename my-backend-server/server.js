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
const STANDARD_SPREADSHEET_ID = '1_dCZkV8-Sun-xphkSi2qlN31Q5FvYQEEv70Mu7tadfA'; 

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
const standardDoc = new GoogleSpreadsheet(STANDARD_SPREADSHEET_ID, serviceAccountAuth);

// =================================================================
// 데이터 캐싱 로직
// =================================================================
let patientCache = []; 
let patientCache2 = []; 
let cachedContacts = { sonhae: [], saengmyeong: [] }; // 원수사 연락망 캐싱
let standardCache = []; // standard 전용 데이터 캐시


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
        console.error(`❌ ${cacheName} 중 심각한 오류 발생:`, error);
        throw error;
    }
}


// ✨ 원수사 연락망 캐싱 함수
async function loadAndCacheContacts() {
    try {
        if (!contactDoc.title) await contactDoc.loadInfo();
        const sheet = contactDoc.sheetsByIndex[0];
        const rowCount = sheet.rowCount;
        const colCount = sheet.columnCount;

        // 헤더 3행
        await sheet.loadCells({ startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: colCount });
        // 데이터 4행부터
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
        cachedContacts.lastUpdated = new Date().toISOString(); // ✅ 갱신 시각 기록

        console.log(`[Contacts] 캐싱 완료 (손해: ${cachedContacts.sonhae.length}, 생명: ${cachedContacts.saengmyeong.length})`);
    } catch (err) {
        console.error('[Contacts] 캐싱 중 오류 발생:', err);
    }
}

// ================================================================
// ➌ standard 시트: "맨 처음 시트"만 읽어서 캐시하는 함수
// - 다양한 컬럼명이 존재할 수 있으므로 row.toObject()를 사용하여 유연하게 처리
// - 나이 컬럼은 숫자로 파싱 가능하면 ageNumeric으로 저장, 아니면 null
// - id는 crypto.randomUUID()로 부여 (원본 행 번호를 사용하려면 row._rowNumber 사용 가능)
// ================================================================
async function loadAndCacheStandard() {
    try {
        // 문서 정보가 로드되지 않았다면 로드
        if (!standardDoc.title) await standardDoc.loadInfo();

        if (!standardDoc.sheetsByIndex || standardDoc.sheetsByIndex.length === 0) {
            console.warn('[Standard] 시트가 없습니다.');
            standardCache = [];
            return;
        }

        const sheet = standardDoc.sheetsByIndex[0]; // ✅ 맨 처음 시트만 사용
        console.log(`[Standard] 첫 번째 시트 로딩: "${sheet.title}"`);

        const rows = await sheet.getRows();
        const mapped = rows.map(row => {
            const obj = row.toObject();

            // 유연한 필드 추출 (컬럼명이 정확히 일치하지 않아도 최대한 잡아냄)
            const 병명 = obj.병명 ?? obj['병명(한글)'] ?? obj['disease'] ?? obj['name'] ?? '';
            const 성별 = (obj.성별 ?? obj.gender ?? '').toString().trim();
            const 나이Raw = obj.나이 ?? obj.age ?? '';
            const 나이Parsed = (typeof 나이Raw === 'number') ? Math.floor(나이Raw) :
                                (typeof 나이Raw === 'string' && 나이Raw.trim() !== '' && !isNaN(parseInt(나이Raw, 10)))
                                    ? parseInt(나이Raw, 10)
                                    : null;
            const 보험회사 = obj.보험회사 ?? obj.company ?? '';
            const 상품종류 = obj.상품종류 ?? obj.product ?? '';
            const 보장내용 = obj.보장내용 ?? obj.coverage ?? '';
            const 고지내용 = obj.고지내용 ?? obj.notice1 ?? '';
            const 심사일자 = obj.심사일자 ?? obj.date ?? '';
            const 심사결과 = obj.심사결과 ?? obj.result1 ?? '';

            return {
                id: crypto.randomUUID(), // 고유 id (원하면 row._rowNumber 사용)
                원본행: row._rowNumber,
                병명,
                성별,
                나이Raw: (나이Raw === undefined || 나이Raw === null) ? '' : String(나이Raw).trim(),
                ageNumeric: 나이Parsed, // 숫자로 파싱 가능하면 숫자, 아니면 null
                보험회사,
                상품종류,
                보장내용,
                고지내용,
                심사일자,
                심사결과,
            };
        });

        standardCache = mapped;
        console.log(`[Standard] 캐싱 완료: ${standardCache.length}건`);
    } catch (err) {
        console.error('[Standard] 캐싱 중 오류 발생:', err);
    }
}



// =================================================================
// Express 앱 설정 및 API 라우트
// =================================================================
const app = express();
app.use(cors());
app.use(express.json());

const frontendDistPath = path.join(__dirname, './dist');
app.use(express.static(frontendDistPath));

// --- 1. 로그인 API ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const sheet = authDoc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        const userRow = rows.find(row => row.get('username') === username);

        if (!userRow) return res.status(404).json({ message: '존재하지 않는 아이디입니다.' });
        if (userRow.get('password') !== password) return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

        // 🔥 이메일 자동 생성 (username@320.com)
        const firebaseEmail = "장성우@320.com";

        res.status(200).json({
            success: true,
            user: {
                username: userRow.get('username'),
                grade: userRow.get('grade'),
                본부: userRow.get('본부') || '미지정',
                지사: userRow.get('지사') || '미지정',
                email: firebaseEmail,   // ✅ 항상 고정된 이메일로 Firebase 접속
                loginTime: new Date().toISOString(),
            }
        });
    } catch (error) {
        console.error('[Backend] 로그인 처리 중 오류:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// --- 2. 회원가입 신청 API ---
app.post('/api/register', async (req, res) => {
    const { username, password, 본부, 지사 } = req.body;
    try {
        const sheet = authDoc.sheetsByTitle['requests'];
        await sheet.addRow({ username, password, 본부, 지사, requestTime: new Date().toLocaleString('ko-KR') }); 
        res.status(201).json({ message: '아이디 신청이 성공적으로 완료되었습니다.' });
    } catch (error) {
        console.error('[Backend] 회원가입 신청 처리 중 오류:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// --- 3. (관리자) 신청 목록 조회 API ---
app.get('/api/requests', async (req, res) => {
    try {
        const sheet = authDoc.sheetsByTitle['requests'];
        const rows = await sheet.getRows();
        const requests = rows.map(row => ({ ...row.toObject(), id: row.rowIndex }));
        res.status(200).json({ requests });
    } catch (error) {
        res.status(500).json({ message: '신청 목록 조회에 실패했습니다.' });
    }
});

// --- 4. (관리자) 신청 승인 API ---
app.post('/api/approve', async (req, res) => {
    const { requestId } = req.body;
    try {
        const requestsSheet = authDoc.sheetsByTitle['requests'];
        const usersSheet = authDoc.sheetsByTitle['users'];
        const rows = await requestsSheet.getRows();
        const requestRow = rows.find(row => row.rowIndex === requestId);

        if (!requestRow) return res.status(404).json({ message: '해당 신청을 찾을 수 없습니다.' });
        
        await usersSheet.addRow({
            username: requestRow.get('username'),
            password: requestRow.get('password'),
            grade: '일반 회원',
            본부: requestRow.get('본부') || '미지정', 
            지사: requestRow.get('지사') || '미지정'
        });
        await requestRow.delete();
        res.status(200).json({ message: '사용자 승인이 완료되었습니다.' });
    } catch (error) {
        console.error('[Backend] 신청 승인 중 오류:', error);
        res.status(500).json({ message: '신청 승인 중 오류가 발생했습니다.' });
    }
});

// --- 5. (관리자) 신청 거절 API ---
app.post('/api/reject', async (req, res) => {
    const { requestId } = req.body;
    try {
        const requestsSheet = authDoc.sheetsByTitle['requests'];
        const rows = await requestsSheet.getRows();
        const requestRow = rows.find(row => row.rowIndex === requestId);
        if (requestRow) {
            await requestRow.delete();
        }
        res.status(200).json({ message: '신청 거절이 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '신청 거절 중 오류가 발생했습니다.' });
    }
});

// --- 6. (관리자) 승인된 사용자 목록 조회 API ---
app.get('/api/users', async (req, res) => {
    try {
        const sheet = authDoc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        const users = rows.map(row => ({ ...row.toObject(), id: row.rowIndex }));
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: '사용자 목록 조회에 실패했습니다.' });
    }
});

// --- 7. (관리자) 사용자 정보 업데이트 API ---
app.post('/api/update-user', async (req, res) => {
    const { id, password, grade, 본부, 지사 } = req.body;
    try {
        const sheet = authDoc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        const userRow = rows.find(row => row.rowIndex === id);
        if (userRow) {
            userRow.set('password', password);
            userRow.set('grade', grade);
            userRow.set('본부', 본부);
            userRow.set('지사', 지사);
            await userRow.save();
            res.status(200).json({ message: '사용자 정보가 업데이트되었습니다.' });
        } else {
            res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
    } catch (error) {
        res.status(500).json({ message: '사용자 업데이트 중 오류가 발생했습니다.' });
    }
});

// --- 8. (관리자) 사용자 삭제 API ---
app.post('/api/delete-user', async (req, res) => {
    const { id } = req.body;
    try {
        const sheet = authDoc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        const userRow = rows.find(row => row.rowIndex === id);
        if (userRow) {
            await userRow.delete();
        }
        res.status(200).json({ message: '사용자가 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '사용자 삭제 중 오류가 발생했습니다.' });
    }
});

// --- 9. 조건 검색 1 API ---
app.get('/api/search-patients', async (req, res) => {
    const { keyword } = req.query;
    console.log(`[Backend] 환자 검색 요청 1 (캐시 1 사용): keyword=${keyword}`);
    try {
        const filteredRows = !keyword 
            ? patientCache 
            : patientCache.filter(patient => 
                (patient.병명 && patient.병명.includes(keyword))
            );
        res.status(200).json({ success: true, patients: filteredRows });
    } catch (error) {
        console.error('[Backend] 환자 검색 중 오류:', error);
        res.status(500).json({ success: false, message: '검색 중 오류가 발생했습니다.' });
    }
});

// --- 10. 조건 검색 2 API ---
app.get('/api/search-patients-2', async (req, res) => {
    const { keyword } = req.query;
    console.log(`[Backend] 환자 검색 요청 2 (캐시 2 사용): keyword=${keyword}`);
    try {
        const filteredRows = !keyword 
            ? patientCache2
            : patientCache2.filter(patient => 
                (patient.병명 && patient.병명.includes(keyword))
            );
        res.status(200).json({ success: true, patients: filteredRows });
    } catch (error) {
        console.error('[Backend] 환자 검색 중 오류:', error);
        res.status(500).json({ success: false, message: '검색 중 오류가 발생했습니다.' });
    }
});

// --- 11. 원수사 연락망 API (캐싱 사용) ---
app.get('/api/contacts', async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            sonhae: cachedContacts.sonhae,
            saengmyeong: cachedContacts.saengmyeong,
            cachedAt: cachedContacts.lastUpdated || new Date().toISOString(), // ✅ 캐시 시각
        });
    } catch (error) {
        console.error('[Backend] 원수사 연락망 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '원수사 연락망 조회 중 오류가 발생했습니다.',
        });
    }
});

// --- 12. 질병인수데이터 API (캐싱 사용) ---
app.get('/api/search-standard', async (req, res) => {
    const { keyword } = req.query;
    console.log(`[Backend] /api/search-standard 요청, keyword=${keyword}`);

    try {
        if (!standardCache || standardCache.length === 0) {
            // 캐시가 비어있을 경우 한 번 로드 시도 (안전장치)
            await loadAndCacheStandard();
        }

        const results = (!keyword || !keyword.trim())
            ? standardCache
            : standardCache.filter(p => p.병명 && p.병명.includes(keyword));

        res.status(200).json({ success: true, patients: results });
    } catch (err) {
        console.error('[Backend] /api/search-standard 처리 중 오류:', err);
        res.status(500).json({ success: false, message: '표준 시트 검색 중 오류가 발생했습니다.' });
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
        await Promise.all([authDoc.loadInfo(), patientDoc.loadInfo(), patientDoc2.loadInfo(), contactDoc.loadInfo(), standardDoc.loadInfo()]);
        console.log(`✅ 사용자 DB 시트 "${authDoc.title}"에 연결되었습니다.`);
        console.log(`✅ 환자 1차 DB 시트 "${patientDoc.title}"에 연결되었습니다.`);
        console.log(`✅ 환자 2차 DB 시트 "${patientDoc2.title}"에 연결되었습니다.`);
        console.log(`✅ 원수사 연락망 시트 "${contactDoc.title}"에 연결되었습니다.`);
        console.log(`✅ 질병인수데이터 DB 시트 "${standardDoc.title}" 연결됨.`); // ✅ 추가

      
        const memoryBefore = process.memoryUsage().heapUsed;
        console.log(`\n[Memory] 캐싱 전 힙(Heap) 메모리 사용량: ${formatBytes(memoryBefore)}`);

        await loadAndCachePatientData(patientDoc, patientCache);
        await loadAndCachePatientData(patientDoc2, patientCache2);
        await loadAndCachePatientData(standardDoc, standardCache);
        await loadAndCacheContacts(); // 초기 연락망 캐싱
        setInterval(loadAndCacheContacts, 180000); // 3분마다 연락망 갱신
        setInterval(loadAndCacheStandard, 600000);  // 3분마다 standard 캐시 갱신
      
        const memoryAfter = process.memoryUsage().heapUsed;
        console.log(`[Memory] 캐싱 후 힙(Heap) 메모리 사용량: ${formatBytes(memoryAfter)}`);

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
