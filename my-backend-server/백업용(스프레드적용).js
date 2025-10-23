const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// --- 설정 ---
const PORT = 4000;
const credentials = require('./google-credentials.json');

// ⚠️ 아래 두 개의 SPREADSHEET_ID를 본인의 구글 시트 ID로 각각 교체해야 합니다.
const AUTH_SPREADSHEET_ID = '1yfPB1mhLnYP59SIRJNsPjiug-3glypQcB1zu4ODXQVs';     // 'my-auth-database'의 ID
const PATIENT_SPREADSHEET_ID = '1R7sNFwF0g-_ii6wNxol3-1xBQUbxnioE3ST70REvpNM'; // 'patients' 스프레드시트의 ID

// --- 구글 시트 인증 ---
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

// =================================================================
// 데이터 캐싱 로직
// =================================================================
let patientCache = []; // 환자 데이터를 저장할 캐시 변수

async function loadAndCachePatientData() {
    console.log('🔄 환자 데이터 캐시를 로드합니다...');
    try {
        const allPatients = [];
        // patientDoc가 로드될 때까지 기다립니다.
        if (!patientDoc.title) await patientDoc.loadInfo();

        for (const sheet of patientDoc.sheetsByIndex) {
            console.log(`  -> "${sheet.title}" 시트 데이터 읽는 중...`);
            const rows = await sheet.getRows();
            const sheetData = rows.map(row => {
                const rowData = row.toObject();
                return {
                    ...rowData,
                    보험회사: sheet.title,
                    id: `${sheet.sheetId}-${row.rowIndex}`
                }
            });
            allPatients.push(...sheetData);
        }
        patientCache = allPatients;
        console.log(`✅ 환자 데이터 캐시 완료. 총 ${patientCache.length}건.`);
    } catch (error) {
        console.error('❌ 환자 데이터 캐싱 중 심각한 오류 발생:', error);
        throw error; // 서버 시작을 중단시키기 위해 에러를 던집니다.
    }
}

// =================================================================
// Express 앱 설정 및 API 라우트
// =================================================================

const app = express();
app.use(cors());
app.use(express.json());

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
                loginTime: new Date().toISOString(),
            }
        });
    } catch (error) {
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// --- 2. 회원가입 신청 API ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const sheet = authDoc.sheetsByTitle['requests'];
        await sheet.addRow({ username, password, requestTime: new Date().toLocaleString('ko-KR') });
        res.status(201).json({ message: '아이디 신청이 성공적으로 완료되었습니다.' });
    } catch (error) {
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
            grade: '일반 회원'
        });
        await requestRow.delete();
        res.status(200).json({ message: '사용자 승인이 완료되었습니다.' });
    } catch (error) {
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
    const { id, password, grade } = req.body;
    try {
        const sheet = authDoc.sheetsByTitle['users'];
        const rows = await sheet.getRows();
        const userRow = rows.find(row => row.rowIndex === id);
        if (userRow) {
            userRow.set('password', password);
            userRow.set('grade', grade);
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


// --- 9. 조건 검색 기능 API (캐시 사용) ---
app.get('/api/search-patients', async (req, res) => {
    const { keyword, 입원유무, 수술유무 } = req.query;
    console.log(`[Backend] 환자 검색 요청 받음 (캐시 사용):`, req.query);
    try {
        const filteredRows = patientCache.filter(patient => {
            const hospitalCheck = (입원유무 === 'true') 
                ? patient.입원유무 && patient.입원유무.includes('예') 
                : patient.입원유무 && patient.입원유무.includes('아니오');
            const surgeryCheck = (수술유무 === 'true') 
                ? patient.수술유무 && patient.수술유무.includes('예') 
                : patient.수술유무 && patient.수술유무.includes('아니오');
            const keywordCheck = !keyword || 
                (patient.병명 && patient.병명.includes(keyword)) || 
                (patient.특이사항1 && patient.특이사항1.includes(keyword)) || 
                (patient.특이사항2 && patient.특이사항2.includes(keyword));
            
            return hospitalCheck && surgeryCheck && keywordCheck;
        });
        
        console.log(`[Backend] 캐시 검색 완료: ${filteredRows.length}건 발견`);
        res.status(200).json({ success: true, patients: filteredRows });
    } catch (error) {
        console.error('[Backend] 환자 검색 중 오류:', error);
        res.status(500).json({ success: false, message: '검색 중 오류가 발생했습니다.' });
    }
});

// =================================================================
// 서버 시작 로직
// =================================================================

async function startServer() {
    try {
        // 1. 구글 시트 문서 정보 로드
        await Promise.all([authDoc.loadInfo(), patientDoc.loadInfo()]);
        console.log(`✅ 사용자 DB 시트 "${authDoc.title}"에 연결되었습니다.`);
        console.log(`✅ 환자 DB 시트 "${patientDoc.title}"에 연결되었습니다.`);

        // 2. 환자 데이터 캐싱
        await loadAndCachePatientData();

        // 3. API 서버 실행
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

// 서버 시작 함수 호출
startServer();

