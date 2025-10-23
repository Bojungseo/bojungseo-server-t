const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const xlsx = require('xlsx');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
const excelFilePath = './upload.xlsx';
const PORT = 4000;

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// =================================================================
// 데이터 업로드 로직 (수정됨)
// =================================================================
async function deleteAllDocuments(collectionRef) {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) {
        console.log(`🗑️  '${collectionRef.id}' 컬렉션에 기존 데이터가 없습니다.`);
        return;
    }
    const batch = db.batch();
    snapshot.docs.forEach(doc => { batch.delete(doc.ref); });
    await batch.commit();
    console.log(`🗑️  '${collectionRef.id}' 컬렉션의 모든 문서(${snapshot.size}개)가 삭제되었습니다.`);
}

async function uploadExcelData() {
  console.log('🚀 데이터베이스 초기화를 시작합니다...');
  const patientsCollection = db.collection('patients');
  try {
    if (!fs.existsSync(excelFilePath)) {
      console.warn(`⚠️  엑셀 파일(${excelFilePath})을 찾을 수 없습니다. 데이터 초기화를 건너뜁니다.`);
      return;
    }
    await deleteAllDocuments(patientsCollection);
    const workbook = xlsx.readFile(excelFilePath);
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;
      console.log(`\n📄  '${sheetName}' 시트의 데이터를 업로드하는 중...`);
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
      if(jsonData.length === 0) continue;
      for (const row of jsonData) {
        // true/false 변환 로직 제거, 텍스트를 그대로 저장하고 없으면 '아니오'로 기본값 설정
        const patientData = {
          병명: row.병명 || '',
          입원유무: row.입원유무 || '아니오',
          수술유무: row.수술유무 || '아니오',
          보험회사: sheetName,
          특이사항1: row.특이사항1 || '',
          특이사항2: row.특이사항2 || '',
        };
        await patientsCollection.add(patientData);
      }
      console.log(`  ✅  '${sheetName}' 시트의 데이터 ${jsonData.length}건이 성공적으로 추가되었습니다.`);
    }
    console.log('\n🎉 데이터베이스 초기화가 성공적으로 완료되었습니다.');
  } catch (error) {
    console.error('❌ 데이터 초기화 중 심각한 오류가 발생했습니다:', error);
    process.exit(1); 
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
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).get();
    if (snapshot.empty) {
      return res.status(404).json({ message: '존재하지 않는 아이디입니다.' });
    }
    let userDoc;
    snapshot.forEach(doc => { userDoc = doc.data(); });
    if (userDoc.password !== password) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }
    res.status(200).json({
      success: true,
      user: {
        username: userDoc.username,
        grade: userDoc.grade,
        loginTime: new Date().toISOString(),
      }
    });
  } catch (error) {
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  }
});

// --- 2. 회원가입 신청 API ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const requestsRef = db.collection('requests');
        await requestsRef.add({
            username,
            password,
            requestTime: new Date(),
        });
        res.status(201).json({ message: '아이디 신청이 성공적으로 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '서버 오류로 인해 신청에 실패했습니다.' });
    }
});

// --- 3. (관리자) 신청 목록 조회 API ---
app.get('/api/requests', async (req, res) => {
    try {
        const snapshot = await db.collection('requests').orderBy('requestTime', 'asc').get();
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            requestTime: doc.data().requestTime.toDate().toISOString(),
        }));
        res.status(200).json({ requests });
    } catch (error) {
        res.status(500).json({ message: '신청 목록을 불러오는 데 실패했습니다.' });
    }
});

// --- 4. (관리자) 신청 승인 API ---
app.post('/api/approve', async (req, res) => {
    const { requestId } = req.body;
    try {
        const requestDocRef = db.collection('requests').doc(requestId);
        const requestDoc = await requestDocRef.get();
        if (!requestDoc.exists) {
            return res.status(404).json({ message: '해당 신청서를 찾을 수 없습니다.' });
        }
        const { username, password } = requestDoc.data();
        await db.collection('users').add({ username, password, grade: '일반 회원' });
        await requestDocRef.delete();
        res.status(200).json({ message: '사용자 승인이 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '승인 처리 중 오류가 발생했습니다.' });
    }
});

// --- 5. (관리자) 신청 거절 API ---
app.post('/api/reject', async (req, res) => {
    const { requestId } = req.body;
    try {
        await db.collection('requests').doc(requestId).delete();
        res.status(200).json({ message: '신청 거절이 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '거절 처리 중 오류가 발생했습니다.' });
    }
});

// --- 6. (관리자) 승인된 사용자 목록 조회 API ---
app.get('/api/users', async (req, res) => {
    try {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: '사용자 목록을 불러오는 데 실패했습니다.' });
    }
});

// --- 7. (관리자) 사용자 정보 업데이트 API ---
app.post('/api/update-user', async (req, res) => {
    const { id, password, grade } = req.body;
    try {
        const userRef = db.collection('users').doc(id);
        await userRef.update({ password, grade });
        res.status(200).json({ message: '사용자 정보가 성공적으로 업데이트되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '사용자 정보 업데이트에 실패했습니다.' });
    }
});

// --- 8. (관리자) 사용자 삭제 API ---
app.post('/api/delete-user', async (req, res) => {
    const { id } = req.body;
    try {
        await db.collection('users').doc(id).delete();
        res.status(200).json({ message: '사용자가 성공적으로 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: '사용자 삭제에 실패했습니다.' });
    }
});


// --- 9. 조건 검색 기능 API 라우트 (대규모 수정) ---
app.get('/api/search-patients', async (req, res) => {
    const { keyword, 입원유무, 수술유무 } = req.query;
    console.log(`[Backend] 환자 검색 요청 받음:`, req.query);

    try {
        // Firestore 쿼리는 이제 사용하지 않으므로, 모든 데이터를 가져옵니다.
        const snapshot = await db.collection('patients').get();
        const allPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 서버에서 직접 필터링을 수행합니다.
        const filteredPatients = allPatients.filter(patient => {
            // --- 입원유무 조건 검사 ---
            // 체크박스가 true('true' 문자열)이면 '예'가 포함된 것을, false이면 '아니오'가 포함된 것을 찾습니다.
            const hospitalCheck = (입원유무 === 'true')
                ? patient.입원유무 && patient.입원유무.includes('예')
                : patient.입원유무 && patient.입원유무.includes('아니오');

            // --- 수술유무 조건 검사 ---
            const surgeryCheck = (수술유무 === 'true')
                ? patient.수술유무 && patient.수술유무.includes('예')
                : patient.수술유무 && patient.수술유무.includes('아니오');
            
            // --- 키워드 조건 검사 ---
            const keywordCheck = !keyword || // 키워드가 없으면 항상 true
                (patient.병명 && patient.병명.includes(keyword)) ||
                (patient.특이사항1 && patient.특이사항1.includes(keyword)) ||
                (patient.특이사항2 && patient.특이사항2.includes(keyword));

            // 모든 조건이 만족해야 최종 결과에 포함됩니다.
            return hospitalCheck && surgeryCheck && keywordCheck;
        });
        
        console.log(`[Backend] 검색 완료: ${filteredPatients.length}건 발견`);
        res.status(200).json({ success: true, patients: filteredPatients });

    } catch (error) {
        console.error('[Backend] 환자 검색 중 오류 발생:', error);
        res.status(500).json({ success: false, message: '환자 검색 중 오류가 발생했습니다.' });
    }
});

// =================================================================
// 서버 시작 로직
// =================================================================
async function startServer() {
  try {
    await uploadExcelData();
    app.listen(PORT, () => {
      console.log('-------------------------------------------');
      console.log(`✅ API 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
      console.log('-------------------------------------------');
    });
  } catch (error) {
    console.error('❌ 서버 시작 프로세스 중 오류가 발생했습니다:', error);
  }
}

startServer();

