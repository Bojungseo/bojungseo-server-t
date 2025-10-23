import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as xlsx from 'xlsx';

// 서비스 계정 키 파일과 엑셀 파일 경로를 설정합니다.
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };
const excelFilePath = './upload.xlsx';

// Firebase Admin SDK 초기화
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const patientsCollection = db.collection('patients');

// --- Firestore 컬렉션의 모든 문서를 삭제하는 함수 ---
async function deleteAllDocuments(collectionRef) {
  const snapshot = await collectionRef.get();
  if (snapshot.empty) {
    console.log('🗑️  기존 데이터가 없습니다. 삭제 작업을 건너뜁니다.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`🗑️  '${collectionRef.id}' 컬렉션의 모든 문서(${snapshot.size}개)가 삭제되었습니다.`);
}

// --- 메인 업로드 함수 ---
async function uploadData() {
  console.log('🚀 데이터 업로드 프로세스를 시작합니다...');
  
  try {
    // 1. 기존 데이터 전체 삭제
    await deleteAllDocuments(patientsCollection);

    // 2. 엑셀 파일 읽기
    const workbook = xlsx.readFile(excelFilePath);
    
    // ✨ 처리할 시트 이름을 명확하게 지정합니다. (한글 이름 사용)
    const sheetNamesToProcess = ['내과', '외과'];

    // 3. 지정된 시트들을 순회
    for (const sheetName of sheetNamesToProcess) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        console.warn(`⚠️  '${sheetName}' 시트를 찾을 수 없습니다. 건너뜁니다.`);
        continue;
      }
      
      console.log(`\n📄  '${sheetName}' 시트를 처리하는 중...`);
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      if(jsonData.length === 0) {
        console.log(`  -> '${sheetName}' 시트에 데이터가 없습니다. 건너뜁니다.`);
        continue;
      }

      // 4. 각 시트의 데이터를 Firestore에 업로드
      for (const row of jsonData) {
        // boolean 값 변환
        const patientData = {
          병명: row.병명,
          입원유무: String(row.입원유무).toLowerCase() === 'true',
          수술유무: String(row.수술유무).toLowerCase() === 'true',
          sheetName: sheetName, // 출처 시트 이름 추가
        };
        await patientsCollection.add(patientData);
        console.log(`  ✅  '${row.병명}' 데이터가 성공적으로 추가되었습니다.`);
      }
    }
    console.log('\n🎉 모든 데이터 업로드가 성공적으로 완료되었습니다.');

  } catch (error) {
    console.error('❌ 업로드 중 심각한 오류가 발생했습니다:', error);
  }
}

// 스크립트 실행
uploadData();

