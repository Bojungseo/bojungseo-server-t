// ================================================================
// server.js (Docker + Vite + Express + Google Sheets 완전 통합 버전)
// ================================================================

const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const crypto = require('crypto'); // ✨ UUID 생성을 위한 crypto 모듈 추가
const path = require('path'); // ✨ 프론트엔드 정적 파일 서빙용

// --- 설정 ---
const PORT = process.env.PORT || 4000;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');
const AUTH_SPREADSHEET_ID = '1yfPB1mhLnYP59SIRJNsPjiug-3glypQcB1zu4ODXQVs';     // 'my-auth-database'의 ID
const PATIENT_SPREADSHEET_ID = '1R7sNFwF0g-_ii6wNxol3-1xBQUbxnioE3ST70REvpNM'; // 'patients' 스프레드시트의 ID
const PATIENT2_SPREADSHEET_ID = '1vsnRcJ4JxO3xwmecWX8pAd6Mr_Wpxf-eyzpkcxb9mBI'; // ✨ 신규 ID
const CONTACT_SPREADSHEET_ID = '14V02SniJzspB-nEYArxrCIEOwhClL3HC94qP8sWZA-s'; // 원수사 연락망


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
// 데이터 캐싱 로직
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
                id: crypto.randomUUID(), // ✨ UUID 기반 ID 생성
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

// =================================================================
// Express 앱 설정 및 API 라우트
// =================================================================
const app = express();
app.use(cors());
app.use(express.json());

// ================================================================
// ✨ 프론트엔드 정적 파일 서빙
// ================================================================
// Docker 컨테이너 내 구조 기준
// (my-vite-app/dist → my-backend-server/dist 로 복사됨)
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

        res.status(200).json({
            success: true,
            user: {
                username: userRow.get('username'),
                grade: userRow.get('grade'),
                본부: userRow.get('본부') || '미지정',
                지사: userRow.get('지사') || '미지정',
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

// --- 11. 원수사 연락망 API (Google Sheets 시트 데이터를 그대로 JSON으로 전달)
app.get('/api/contacts', async (req, res) => {
    try {
        // 👉 원수사 연락망용 구글 시트 객체 생성
        const contactDoc = new GoogleSpreadsheet(CONTACT_SPREADSHEET_ID, serviceAccountAuth);

        // 시트 메타데이터 로드 (sheet list 불러오기 전에 필요)
        await contactDoc.loadInfo();

        // 첫 번째 시트를 선택
        const sheet = contactDoc.sheetsByIndex[0];

        // 헤더(컬럼명) 불러오기
        await sheet.loadHeaderRow();

        // 전체 데이터 행 가져오기
        const rows = await sheet.getRows();

        // 각 행을 일반 객체로 변환
        const contacts = rows.map(row => row.toObject());

        // 응답 반환
        res.status(200).json({ success: true, contacts });

    } catch (error) {
        console.error('[Backend] 원수사 연락망 불러오기 오류:', error);
        res.status(500).json({
            success: false,
            message: '원수사 연락망 조회 중 오류가 발생했습니다.'
        });
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
        console.log(`✅ 사용자 DB 시트 "${authDoc.title}"에 연결되었습니다.`);
        console.log(`✅ 환자 1차 DB 시트 "${patientDoc.title}"에 연결되었습니다.`);
        console.log(`✅ 환자 2차 DB 시트 "${patientDoc2.title}"에 연결되었습니다.`);

        const memoryBefore = process.memoryUsage().heapUsed;
        console.log(`\n[Memory] 캐싱 전 힙(Heap) 메모리 사용량: ${formatBytes(memoryBefore)}`);

        await loadAndCachePatientData(patientDoc, patientCache);
        await loadAndCachePatientData(patientDoc2, patientCache2);

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
