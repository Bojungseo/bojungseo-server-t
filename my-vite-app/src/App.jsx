import React, { useState, useEffect, useCallback } from 'react';

// 백엔드 서버의 주소입니다.
const BACKEND_URL = '';

// ===============================================
// API 통신 함수 모음 (변경 없음)
// ===============================================
const apiLogin = async (username, password) => {
    const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '로그인 실패');
      return data;
};
const apiRegister = async (username, password, 본부, 지사) => {
    const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, 본부, 지사 }), // 본부, 지사 전송
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '아이디 신청 실패');
      return data;
};
const apiGetRequests = async () => {
    const response = await fetch(`${BACKEND_URL}/api/requests`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '신청 목록 조회 실패');
    return data.requests;
};
const apiApproveRequest = async (requestId) => {
    const response = await fetch(`${BACKEND_URL}/api/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '승인 처리 실패');
    return data;
};
const apiRejectRequest = async (requestId) => {
    const response = await fetch(`${BACKEND_URL}/api/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '거절 처리 실패');
    return data;
};
const apiGetUsers = async () => {
    const response = await fetch(`${BACKEND_URL}/api/users`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '사용자 목록 조회 실패');
    return data.users;
};
const apiUpdateUser = async (userData) => {
    const response = await fetch(`${BACKEND_URL}/api/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData), // { id, password, grade, 본부, 지사 }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '사용자 정보 업데이트 실패');
    return data;
};
const apiDeleteUser = async (id) => {
    const response = await fetch(`${BACKEND_URL}/api/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '사용자 삭제 실패');
    return data;
};

const apiSearchPatients = async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BACKEND_URL}/api/search-patients?${query}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '환자 검색 실패');
    return data.patients;
}

const apiSearchPatients2 = async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BACKEND_URL}/api/search-patients-2?${query}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '환자 검색 실패');
    return data.patients;
}

// ===============================================
// UI 컴포넌트
// ===============================================

function LoginPage({ onLogin, onShowRegisterModal }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      try {
        await onLogin(username, password);
      } catch (err) {
        setError(err.message);
      }
    };
  
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">로그인</h2>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="아이디" className="w-full px-3 py-2 border rounded-md" required />
            </div>
            <div className="mb-6">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="w-full px-3 py-2 border rounded-md" required />
            </div>
            <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors">로그인</button>
          </form>
          <button onClick={onShowRegisterModal} className="w-full mt-4 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-colors">아이디 신청하기</button>
        </div>
      </div>
    );
}

function RequestIdModal({ onClose, onRegisterSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [본부, set본부] = useState(''); 
    const [지사, set지사] = useState(''); 
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setMessage('');
      setError('');
      try {
        await apiRegister(username, password, 본부, 지사); 
        onRegisterSuccess(); 
      } catch (err) {
        setError(err.message);
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4">아이디 신청</h2>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="신청자 이름" className="w-full px-3 py-2 border rounded-md" required />
            </div>
            <div className="mb-4">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="사용할 비밀번호" className="w-full px-3 py-2 border rounded-md" required />
            </div>
            <div className="mb-4">
              <input type="text" value={본부} onChange={(e) => set본부(e.target.value)} placeholder="본부 입력 [예) 320본부]" className="w-full px-3 py-2 border rounded-md" required />
            </div>
            <div className="mb-6">
              <input type="text" value={지사} onChange={(e) => set지사(e.target.value)} placeholder="지사 입력 [예) 메테오지사]" className="w-full px-3 py-2 border rounded-md" required />
            </div>
            <div className="flex justify-between">
              <button type="submit" className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">아이디 신청하기</button>
              <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">닫기</button>
            </div>
          </form>
        </div>
      </div>
    );
}

function SuccessModal({ onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white p-10 rounded-xl shadow-2xl w-96 text-center transform transition-all scale-100">
                <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h2 className="text-2xl font-bold mb-2 text-green-700">아이디 신청 완료!</h2>
                <p className="text-gray-600 mb-6">관리자에게 승인을 요청했습니다.</p>
                <button onClick={onClose} className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors font-semibold">
                    확인
                </button>
            </div>
        </div>
    );
}


// --- DashboardPage 컴포넌트 (변경 없음) ---
function DashboardPage({ user, onLogout, onGoToAdminPanel, onGoToMenuPage1, onGoToMenuPage2, onGoToSettings, onGoToExtra1, onGoToExtra2, onGoToExtra3 }) {
    // 남은 시간을 초 단위로 저장하는 상태 (60분 = 3600초)
    const [remainingTime, setRemainingTime] = useState(0);

    // ✨ 남은 시간 계산 로직
    useEffect(() => {
        const savedItem = localStorage.getItem('loggedInUser');
        if (!savedItem) {
            onLogout();
            return;
        }
        const { expiry } = JSON.parse(savedItem);
        
        const updateTimer = () => {
            const now = new Date().getTime();
            const timeDiff = expiry - now; // 만료 시간과 현재 시간의 차이 (밀리초)
            
            if (timeDiff <= 0) {
                setRemainingTime(0);
                clearInterval(intervalId);
                onLogout(); // 시간이 만료되면 자동 로그아웃
                return;
            }

            setRemainingTime(Math.floor(timeDiff / 1000)); // 초 단위로 변환
        };

        const intervalId = setInterval(updateTimer, 1000);
        updateTimer(); // 즉시 한 번 업데이트

        return () => clearInterval(intervalId); // 컴포넌트 언마운트 시 타이머 정리
    }, [onLogout]);

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    // 사용자 정보 섹션을 컴팩트한 세로 배열로 렌더링하는 컴포넌트
    const UserInfoCard = () => (
        <div className="bg-white p-4 rounded-lg shadow-md w-full">
            <h2 className="text-xl font-bold mb-3 border-b pb-2">사용자 정보</h2>
            <div className="flex flex-col space-y-3">
                <div className="p-1 border-b border-gray-100">
                    <p className="text-xs text-gray-500">아이디</p>
                    <p className="font-semibold text-base text-blue-600">{user.username}</p>
                </div>
                <div className="p-1 border-b border-gray-100">
                    <p className="text-xs text-gray-500">본부</p>
                    <p className="text-base font-semibold text-indigo-600">{user.본부 || '미지정'}</p>
                </div>
                <div className="p-1 border-b border-gray-100">
                    <p className="text-xs text-gray-500">지사</p>
                    <p className="text-base font-semibold text-green-600">{user.지사 || '미지정'}</p>
                </div>
                <div className="p-1">
                    <p className="text-xs text-gray-500">남은 시간</p>
                    <p className="text-base font-semibold text-yellow-600">{formatTime(remainingTime)}</p>
                </div>
            </div>
        </div>
    );
    
    // 바로가기 버튼들을 한 줄로 표시하는 컴포넌트 (가로 배치)
    const QuickLinksRow = () => {
        const isManager = user.grade === '최고 관리자';
        
        const allButtons = [
            { label: '예외질환 검색(유병자)', onClick: onGoToMenuPage1 },
            { label: '예외질환 검색(건강고지)', onClick: onGoToMenuPage2 },
            { label: '예정이율 체크', onClick: onGoToSettings, managerOnly: true },
            { label: '화재보험산정', onClick: onGoToExtra1, managerOnly: true },
            { label: '원수사 연락망', onClick: onGoToExtra2, managerOnly: true },
            { label: '질병인수 데이터', onClick: onGoToExtra3, managerOnly: true },
        ];

        return (
            <div className="bg-white p-4 rounded-lg shadow-md h-full">
                <h2 className="text-xl font-bold mb-3 border-b pb-2 text-gray-700">바로가기</h2>
                <div className="flex flex-wrap gap-2">
                    {allButtons.map((button, index) => {
                        if (button.managerOnly && !isManager) return null;
                        
                        return (
                            <button 
                                key={index} 
                                onClick={button.onClick} 
                                className="text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-md transition-colors text-sm"
                            >
                                {button.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };


  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="w-full">
        {/* --- 상단 헤더 --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">보정서 설계사 지원</h1>
                <button onClick={onLogout} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">로그아웃</button>
            </div>
        </div>
        
        {/* ✨ 상단 정보 구역: 사용자 정보 (1열) + 바로가기 (4열) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
            
            {/* --- 좌측: 사용자 정보 (1열 차지) --- */}
            <div className="lg:col-span-1">
                <UserInfoCard />
                
                {/* 2. 관리자 버튼 (사용자 정보 카드 아래에 배치) */}
                {user.grade === '최고 관리자' && (
                    <div className="mt-4">
                        <button onClick={onGoToAdminPanel} className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-bold shadow-md hover:bg-purple-700 transition-transform transform hover:scale-105">
                            🛠 관리자패널 
                        </button>
                    </div>
                )}
            </div>
            
            {/* --- 우측: 바로가기 (4열 차지, 가로 배치) --- */}
            <div className="lg:col-span-4">
                <QuickLinksRow />
            </div>
        </div>
        
        {/* --- ✨ 메인 컨텐츠 영역: 게시판을 좌우 두 개로 분리 --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* --- 게시판 1 --- */}
            <div className="bg-white p-6 rounded-lg shadow-md h-full">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-gray-700">공지사항</h2>
                <ul className="space-y-2">
                    <li className="p-3 border-b hover:bg-gray-100 cursor-pointer rounded-md">필독! 11월 시스템 정기 점검 안내</li>
                    <li className="p-3 border-b hover:bg-gray-100 cursor-pointer rounded-md">신규 기능 '조건 검색' 사용 가이드</li>
                    <li className="p-3 hover:bg-gray-100 cursor-pointer rounded-md">관리자 패널 사용 변경사항 공지</li>
                </ul>
            </div>

            {/* --- 게시판 2 --- */}
            <div className="bg-white p-6 rounded-lg shadow-md h-full">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-gray-700">자유 게시판</h2>
                <ul className="space-y-2">
                    <li className="p-3 border-b hover:bg-gray-100 cursor-pointer rounded-md">오늘 점심 메뉴 추천받습니다!</li>
                    <li className="p-3 border-b hover:bg-gray-100 cursor-pointer rounded-md">버튼 색깔이 너무 예쁘네요.</li>
                    <li className="p-3 hover:bg-gray-100 cursor-pointer rounded-md">새로운 문의사항을 남겨주세요.</li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
}

// --- AdminPanelPage (변경 없음) ---
function AdminPanelPage({ onGoToDashboard }) {
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingUser, setEditingUser] = useState(null); // 현재 수정 중인 사용자의 id와 데이터를 저장

    const fetchData = useCallback(async () => {
      try {
        setLoading(true);
        setError('');
        const [requestsData, usersData] = await Promise.all([
            apiGetRequests(),
            apiGetUsers()
        ]);
        setRequests(requestsData);
        setUsers(usersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      fetchData();
    }, [fetchData]);

    const handleApprove = async (requestId) => {
        if (window.confirm('이 사용자의 아이디 신청을 승인하시겠습니까?')) {
            try {
              await apiApproveRequest(requestId);
              fetchData();
            } catch (err) {
              alert(err.message);
            }
        }
    };
  
    const handleReject = async (requestId) => {
        if (window.confirm('이 사용자의 아이디 신청을 거절하시겠습니까?')) {
            try {
                await apiRejectRequest(requestId);
                setRequests(prev => prev.filter(req => req.id !== requestId));
            } catch (err) {
                alert(err.message);
            }
        }
    };

    const handleEditUser = (user) => {
        setEditingUser({ 
            ...user, 
            본부: user.본부 || '미지정',
            지사: user.지사 || '미지정',
        }); 
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
    };

    const handleUpdateUser = async () => {
        if (window.confirm(`'${editingUser.username}' 사용자의 정보를 저장하시겠습니까?`)) {
            try {
                await apiUpdateUser({
                    id: editingUser.id,
                    password: editingUser.password,
                    grade: editingUser.grade,
                    본부: editingUser.본부, 
                    지사: editingUser.지사, 
                });
                setEditingUser(null);
                fetchData();
            } catch (err) {
                alert(err.message);
            }
        }
    };
    
    const handleDeleteUser = async (userId, username) => {
        if (window.confirm(`정말로 '${username}' 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            try {
                await apiDeleteUser(userId);
                fetchData();
            } catch (err) {
                alert(err.message);
            }
        }
    };

    const handleEditingUserChange = (e) => {
        const { name, value } = e.target;
        setEditingUser(prev => ({ ...prev, [name]: value }));
    };
  
    return (
      <div className="p-8 min-h-screen bg-gray-100">
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">👑 관리자 패널</h1>
                <button onClick={onGoToDashboard} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">대시보드로 돌아가기</button>
            </div>
  
            {loading && <p className="text-center">데이터를 불러오는 중입니다...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
            
            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">아이디 신청 목록</h2>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="py-2 px-4 border-b">신청 아이디</th>
                                        <th className="py-2 px-4 border-b">작업</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.length > 0 ? (
                                        requests.map(req => (
                                            <tr key={req.id}>
                                                <td className="py-2 px-4 border-b text-center">{req.username}</td>
                                                <td className="py-2 px-4 border-b text-center">
                                                    <button onClick={() => handleApprove(req.id)} className="text-sm bg-green-500 text-white px-2 py-1 rounded-md mr-2 hover:bg-green-600">승인</button>
                                                    <button onClick={() => handleReject(req.id)} className="text-sm bg-red-500 text-white px-2 py-1 rounded-md mr-2 hover:bg-red-600">거절</button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" className="py-4 px-4 text-center text-gray-500">새로운 아이디 신청이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">승인된 사용자 관리</h2>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="py-2 px-4 border-b">아이디</th>
                                        <th className="py-2 px-4 border-b">비밀번호</th>
                                        <th className="py-2 px-4 border-b">등급</th>
                                        <th className="py-2 px-4 border-b">본부</th>
                                        <th className="py-2 px-4 border-b">지사</th>
                                        <th className="py-2 px-4 border-b">작업</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            {editingUser && editingUser.id === user.id ? (
                                                <>
                                                    <td className="py-2 px-4 border-b text-center">{user.username}</td>
                                                    <td className="py-2 px-4 border-b"><input type="text" name="password" value={editingUser.password} onChange={handleEditingUserChange} className="w-full px-2 py-1 border rounded-md"/></td>
                                                    <td className="py-2 px-4 border-b"><input type="text" name="grade" value={editingUser.grade} onChange={handleEditingUserChange} className="w-full px-2 py-1 border rounded-md"/></td>
                                                    <td className="py-2 px-4 border-b"><input type="text" name="본부" value={editingUser.본부} onChange={handleEditingUserChange} className="w-full px-2 py-1 border rounded-md"/></td>
                                                    <td className="py-2 px-4 border-b"><input type="text" name="지사" value={editingUser.지사} onChange={handleEditingUserChange} className="w-full px-2 py-1 border rounded-md"/></td>
                                                    <td className="py-2 px-4 border-b text-center whitespace-nowrap">
                                                        <button onClick={handleUpdateUser} className="text-sm bg-blue-500 text-white px-2 py-1 rounded-md mr-2 hover:bg-blue-600">저장</button>
                                                        <button onClick={handleCancelEdit} className="text-sm bg-gray-500 text-white px-2 py-1 rounded-md mr-2 hover:bg-gray-600">취소</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="py-2 px-4 border-b text-center">{user.username}</td>
                                                    <td className="py-2 px-4 border-b text-center">{user.password}</td>
                                                    <td className="py-2 px-4 border-b text-center">{user.grade}</td>
                                                    <td className="py-2 px-4 border-b text-center">{user.본부 || '미지정'}</td>
                                                    <td className="py-2 px-4 border-b text-center">{user.지사 || '미지정'}</td>
                                                    <td className="py-2 px-4 border-b text-center whitespace-nowrap">
                                                        <button onClick={() => handleEditUser(user)} className="text-sm bg-yellow-500 text-white px-2 py-1 rounded-md mr-2 hover:bg-yellow-600">수정</button>
                                                        <button onClick={() => handleDeleteUser(user.id, user.username)} className="text-sm bg-red-500 text-white px-2 py-1 rounded-md mr-2 hover:bg-red-600">삭제</button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    );
}

// --- MenuPage1 (조건 검색 1) ---
function MenuPage1({ onGoToDashboard }) {
    const [keyword, setKeyword] = useState('');
    const [secondaryKeyword, setSecondaryKeyword] = useState(''); 
    const [isHospitalized, setIsHospitalized] = useState(false);
    const [hadSurgery, setHadSurgery] = useState(false);
    
    const [baseResults, setBaseResults] = useState([]);
    const [displayResults, setDisplayResults] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);
    const [filtersEnabled, setFiltersEnabled] = useState(false);
    const [insuranceCompanies, setInsuranceCompanies] = useState([]); 
    const [selectedInsurance, setSelectedInsurance] = useState('전체'); 

    const handleInitialSearch = async (e) => {
        e.preventDefault();
        if (!keyword.trim()) {
            alert('검색어를 입력해주세요.');
            return;
        }
        setLoading(true);
        setError('');
        setFiltersEnabled(false);
        setSecondaryKeyword('');
        setSelectedInsurance('전체');
        try {
            const data = await apiSearchPatients({ keyword });
            
            // 1차 검색 시 체크박스 필터링을 여기서 적용하여 baseResults를 확정
            let initialFiltered = data;

            // 입원유무 필터 적용 (안전한 접근 적용)
            initialFiltered = initialFiltered.filter(p => {
                const value = p.입원유무 || ''; // null/undefined를 빈 문자열로 처리
                return isHospitalized ? value.includes('예') : value.includes('아니오');
            });

            // 수술유무 필터 적용
            initialFiltered = initialFiltered.filter(p => {
                const value = p.수술유무 || ''; // null/undefined를 빈 문자열로 처리
                return hadSurgery ? value.includes('예') : value.includes('아니오');
            });

            setBaseResults(initialFiltered); // 필터링된 결과를 원본으로 저장
            setDisplayResults(initialFiltered); // 처음에는 이 결과를 보여줌
            
            setFiltersEnabled(true);
            setIsHospitalized(false); // 1차 검색 후 체크박스 상태는 초기화 (2차 필터용)
            setHadSurgery(false); // 1차 검색 후 체크박스 상태는 초기화 (2차 필터용)

            const uniqueCompanies = ['전체', ...new Set(initialFiltered.map(p => p.보험회사).filter(Boolean))];
            setInsuranceCompanies(uniqueCompanies);

        } catch (err) {
            setError(err.message);
            setBaseResults([]);
            setDisplayResults([]);
        } finally {
            setLoading(false);
        }
    };
    
    const handleReset = () => {
        setKeyword('');
        setSecondaryKeyword('');
        setBaseResults([]);
        setDisplayResults([]);
        setFiltersEnabled(false);
        setSearched(false);
        setError('');
        setIsHospitalized(false);
        setHadSurgery(false);
        setInsuranceCompanies([]);
        setSelectedInsurance('전체');
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (filtersEnabled) {
            handleReset();
        } else {
            handleInitialSearch(e);
        }
    }

    // ✨ useEffect 수정: 2차 필터만 실시간으로 baseResults에 적용
    useEffect(() => {
        if (!filtersEnabled || baseResults.length === 0) return;

        let filtered = [...baseResults];

        // 1. 재검색 키워드 필터링
        if (secondaryKeyword.trim()) {
            const secondaryKwd = secondaryKeyword.trim().toLowerCase();
            filtered = filtered.filter(p => p.병명 && p.병명.toLowerCase().includes(secondaryKwd));
        }

        // 2. 보험회사 필터링
        if (selectedInsurance !== '전체') {
            filtered = filtered.filter(p => p.보험회사 === selectedInsurance);
        }
        
        // 렌더링 시 시각적 오류 방지를 위해 새로운 배열로 강제 생성하여 렌더링
        setDisplayResults([...filtered]); 

    }, [baseResults, filtersEnabled, secondaryKeyword, selectedInsurance]); 

    return (
        <div className="p-8 min-h-screen bg-gray-50">
            <div className="w-full">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">예외질환 검색(유병자)</h1>
                        <button onClick={onGoToDashboard} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                            대시보드로 돌아가기
                        </button>
                    </div>

                    <form onSubmit={handleFormSubmit} className="p-4 bg-gray-100 rounded-lg flex flex-col gap-4 border">
                        {/* 1차 검색 칸과 버튼 */}
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <input 
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="1차 검색: 병명 키워드"
                                disabled={filtersEnabled || loading} // ✨ 검색 완료 시 비활성화
                                className={`flex-grow px-3 py-2 border rounded-md ${filtersEnabled ? 'bg-gray-200' : 'bg-white'}`}
                            />
                            {/* 체크박스 영역 */}
                            <div className="flex items-center gap-4 mt-2 md:mt-0">
                                <label className={`flex items-center gap-2 ${filtersEnabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
                                    <input 
                                        type="checkbox"
                                        checked={isHospitalized}
                                        onChange={(e) => setIsHospitalized(e.target.checked)}
                                        disabled={filtersEnabled || loading} // ✨ 활성화 반전
                                        className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 disabled:bg-gray-200"
                                    />
                                    입원유무
                                </label>
                                <label className={`flex items-center gap-2 ${filtersEnabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
                                    <input 
                                        type="checkbox"
                                        checked={hadSurgery}
                                        onChange={(e) => setHadSurgery(e.target.checked)}
                                        disabled={filtersEnabled || loading} // ✨ 활성화 반전
                                        className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 disabled:bg-gray-200"
                                    />
                                    수술유무
                                </label>
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading || (!filtersEnabled && !keyword.trim())} 
                                className={`w-full md:w-auto text-white px-6 py-2 rounded-md transition-colors 
                                    ${filtersEnabled 
                                        ? 'bg-orange-500 hover:bg-orange-600'
                                        : 'bg-blue-500 hover:bg-blue-600'}
                                    disabled:bg-gray-400`}
                            >
                                {filtersEnabled ? '초기화' : (loading ? '검색 중...' : '검색')}
                            </button>
                        </div>
                        
                        {/* 2차 재검색 및 체크박스/드롭다운 필터 영역 */}
                        <div className="p-4 bg-white rounded-md flex flex-col gap-4 border border-dashed border-gray-300">
                            
                            <div className="flex items-center gap-4 w-full">
                                {/* 보험회사 드롭다운 */}
                                <select 
                                    value={selectedInsurance}
                                    onChange={(e) => setSelectedInsurance(e.target.value)}
                                    disabled={!filtersEnabled || loading}
                                    className={`px-3 py-2 border rounded-md ${!filtersEnabled ? 'bg-gray-200' : 'bg-white'}`}
                                >
                                    {insuranceCompanies.map(company => (
                                        <option key={company} value={company}>{company}</option>
                                    ))}
                                </select>

                                {/* 2차 재검색 입력 칸 */}
                                <input 
                                    type="text"
                                    value={secondaryKeyword}
                                    onChange={(e) => setSecondaryKeyword(e.target.value)}
                                    placeholder="2차 필터: 검색 결과 내에서 병명 재검색"
                                    disabled={!filtersEnabled || loading}
                                    className={`flex-grow px-3 py-2 border rounded-md ${!filtersEnabled ? 'bg-gray-200' : 'bg-white'}`}
                                />
                            </div>
                        </div>
                    </form>

                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                           <h2 className="text-2xl font-semibold">검색 결과</h2>
                           <span className="text-gray-600 font-medium">
                               { displayResults.length }건 / (원본 {baseResults.length}건)
                           </span>
                        </div>
                        {error && <p className="text-center text-red-500 p-4">{error}</p>}
                        
                        {/* ✨ 검색 결과 테이블 렌더링 영역 */}
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="py-3 px-4 border-b text-left">병명</th>
                                        <th className="py-3 px-4 border-b text-left">보험회사</th>
                                        <th className="py-3 px-4 border-b text-left">특이사항1</th>
                                        <th className="py-3 px-4 border-b text-left">특이사항2</th>
                                        <th className="py-3 px-4 border-b text-center">입원유무</th>
                                        <th className="py-3 px-4 border-b text-center">수술유무</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" className="py-4 text-center">검색 중...</td></tr>
                                    ) : displayResults.length > 0 ? (
                                        displayResults.map(patient => (
                                            <tr key={patient.id} className="hover:bg-gray-50">
                                                <td className="py-3 px-4 border-b">{patient.병명}</td>
                                                <td className="py-3 px-4 border-b">{patient.보험회사}</td>
                                                <td className="py-3 px-4 border-b">{patient.특이사항1}</td>
                                                <td className="py-3 px-4 border-b">{patient.특이사항2}</td>
                                                <td className="py-3 px-4 border-b text-center">{patient.입원유무}</td>
                                                <td className="py-3 px-4 border-b text-center">{patient.수술유무}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="py-4 text-center text-gray-500">
                                                {error ? '오류가 발생했습니다.' : '검색 결과가 없습니다. 검색어를 입력하고 검색 버튼을 눌러주세요.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


// --- MenuPage2 (조건 검색 2 - 신규 DB 연결) ---
function MenuPage2({ onGoToDashboard }) {
    const [keyword, setKeyword] = useState('');
    const [secondaryKeyword, setSecondaryKeyword] = useState(''); 
    const [isHospitalized, setIsHospitalized] = useState(false);
    const [hadSurgery, setHadSurgery] = useState(false);
    
    const [baseResults, setBaseResults] = useState([]);
    const [displayResults, setDisplayResults] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);
    const [filtersEnabled, setFiltersEnabled] = useState(false);
    const [insuranceCompanies, setInsuranceCompanies] = useState([]); 
    const [selectedInsurance, setSelectedInsurance] = useState('전체'); 

    const handleInitialSearch = async (e) => {
        e.preventDefault();
        if (!keyword.trim()) {
            alert('검색어를 입력해주세요.');
            return;
        }
        setLoading(true);
        setError('');
        setFiltersEnabled(false);
        setSecondaryKeyword('');
        setSelectedInsurance('전체');
        try {
            const data = await apiSearchPatients2({ keyword }); // 👈 2번 API 사용
            
            // 1차 검색 시 체크박스 필터링을 여기서 적용하여 baseResults를 확정
            let initialFiltered = data;

            // 입원유무 필터 적용
            if (isHospitalized) {
                initialFiltered = initialFiltered.filter(p => p.입원유무 && p.입원유mu.includes('예'));
            } else {
                initialFiltered = initialFiltered.filter(p => p.입원유무 && p.입원유mu.includes('아니오'));
            }

            // 수술유무 필터 적용
            if (hadSurgery) {
                initialFiltered = initialFiltered.filter(p => p.수술유무 && p.수술유무.includes('예'));
            } else {
                initialFiltered = initialFiltered.filter(p => p.수술유무 && p.수술유무.includes('아니오'));
            }
            
            setBaseResults(initialFiltered);
            setDisplayResults(initialFiltered);
            setFiltersEnabled(true);
            setIsHospitalized(false);
            setHadSurgery(false);
            
            const uniqueCompanies = ['전체', ...new Set(data.map(p => p.보험회사).filter(Boolean))];
            setInsuranceCompanies(uniqueCompanies);

        } catch (err) {
            setError(err.message);
            setBaseResults([]);
            setDisplayResults([]);
        } finally {
            setLoading(false);
        }
    };
    
    const handleReset = () => {
        setKeyword('');
        setSecondaryKeyword('');
        setBaseResults([]);
        setDisplayResults([]);
        setFiltersEnabled(false);
        setSearched(false);
        setError('');
        setIsHospitalized(false);
        setHadSurgery(false);
        setInsuranceCompanies([]);
        setSelectedInsurance('전체');
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (filtersEnabled) {
            handleReset();
        } else {
            handleInitialSearch(e);
        }
    }

    useEffect(() => {
        if (!filtersEnabled || baseResults.length === 0) return;

        let filtered = [...baseResults];

        if (isHospitalized) {
            filtered = filtered.filter(p => p.입원유무 && p.입원유무.includes('예'));
        } else {
             filtered = filtered.filter(p => p.입원유무 && p.입원유무.includes('아니오'));
        }

        if (hadSurgery) {
            filtered = filtered.filter(p => p.수술유무 && p.수술유무.includes('예'));
        } else {
            filtered = filtered.filter(p => p.수술유무 && p.수술유무.includes('아니오'));
        }
        
        if (secondaryKeyword.trim()) {
            const secondaryKwd = secondaryKeyword.trim().toLowerCase();
            filtered = filtered.filter(p => p.병명 && p.병명.toLowerCase().includes(secondaryKwd));
        }

        if (selectedInsurance !== '전체') {
            filtered = filtered.filter(p => p.보험회사 === selectedInsurance);
        }
        
        setDisplayResults(filtered);

    }, [isHospitalized, hadSurgery, baseResults, filtersEnabled, secondaryKeyword, selectedInsurance]); 

    return (
        <div className="p-8 min-h-screen bg-gray-50">
            <div className="w-full">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">예외질환 검색(건강고지)</h1>
                        <button onClick={onGoToDashboard} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                            대시보드로 돌아가기
                        </button>
                    </div>

                    <form onSubmit={handleFormSubmit} className="p-4 bg-gray-100 rounded-lg flex flex-col gap-4 border">
                        {/* 1차 검색 칸과 버튼 */}
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <input 
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="1차 검색: 병명 키워드"
                                disabled={filtersEnabled || loading}
                                className={`flex-grow px-3 py-2 border rounded-md ${filtersEnabled ? 'bg-gray-200' : 'bg-white'}`}
                            />
                            {/* 체크박스 영역 */}
                            <div className="flex items-center gap-4 mt-2 md:mt-0">
                                <label className={`flex items-center gap-2 ${filtersEnabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
                                    <input 
                                        type="checkbox"
                                        checked={isHospitalized}
                                        onChange={(e) => setIsHospitalized(e.target.checked)}
                                        disabled={filtersEnabled}
                                        className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 disabled:bg-gray-200"
                                    />
                                    입원유무
                                </label>
                                <label className={`flex items-center gap-2 ${filtersEnabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
                                    <input 
                                        type="checkbox"
                                        checked={hadSurgery}
                                        onChange={(e) => setHadSurgery(e.target.checked)}
                                        disabled={filtersEnabled}
                                        className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 disabled:bg-gray-200"
                                    />
                                    수술유무
                                </label>
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading || (!filtersEnabled && !keyword.trim())} 
                                className={`w-full md:w-auto text-white px-6 py-2 rounded-md transition-colors 
                                    ${filtersEnabled 
                                        ? 'bg-orange-500 hover:bg-orange-600'
                                        : 'bg-blue-500 hover:bg-blue-600'}
                                    disabled:bg-gray-400`}
                            >
                                {filtersEnabled ? '초기화' : (loading ? '검색 중...' : '검색')}
                            </button>
                        </div>
                        
                        {/* 2차 재검색 및 체크박스/드롭다운 필터 영역 */}
                        <div className="p-4 bg-white rounded-md flex flex-col md:flex-row items-center gap-4 border border-dashed border-gray-300">
                            
                            {/* 보험회사 드롭다운 */}
                            <select 
                                value={selectedInsurance}
                                onChange={(e) => setSelectedInsurance(e.target.value)}
                                disabled={!filtersEnabled || loading}
                                className={`px-3 py-2 border rounded-md ${!filtersEnabled ? 'bg-gray-200' : 'bg-white'}`}
                            >
                                {insuranceCompanies.map(company => (
                                    <option key={company} value={company}>{company}</option>
                                ))}
                            </select>

                            {/* 2차 재검색 입력 칸 */}
                            <input 
                                type="text"
                                value={secondaryKeyword}
                                onChange={(e) => setSecondaryKeyword(e.target.value)}
                                placeholder="2차 필터: 검색 결과 내에서 병명 재검색"
                                disabled={!filtersEnabled || loading}
                                className={`flex-grow px-3 py-2 border rounded-md ${!filtersEnabled ? 'bg-gray-200' : 'bg-white'}`}
                            />
                        </div>
                    </form>

                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                           <h2 className="text-2xl font-semibold">검색 결과</h2>
                           <span className="text-gray-600 font-medium">
                               { displayResults.length }건 / (원본 {baseResults.length}건)
                           </span>
                        </div>
                        {error && <p className="text-center text-red-500 p-4">{error}</p>}
                        
                        {/* ✨ 검색 결과 테이블 렌더링 영역 */}
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="py-3 px-4 border-b text-left">병명</th>
                                        <th className="py-3 px-4 border-b text-left">보험회사</th>
                                        <th className="py-3 px-4 border-b text-left">특이사항1</th>
                                        <th className="py-3 px-4 border-b text-left">특이사항2</th>
                                        <th className="py-3 px-4 border-b text-center">입원유무</th>
                                        <th className="py-3 px-4 border-b text-center">수술유무</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" className="py-4 text-center">검색 중...</td></tr>
                                    ) : displayResults.length > 0 ? (
                                        displayResults.map(patient => (
                                            <tr key={patient.id} className="hover:bg-gray-50">
                                                <td className="py-3 px-4 border-b">{patient.병명}</td>
                                                <td className="py-3 px-4 border-b">{patient.보험회사}</td>
                                                <td className="py-3 px-4 border-b">{patient.특이사항1}</td>
                                                <td className="py-3 px-4 border-b">{patient.특이사항2}</td>
                                                <td className="py-3 px-4 border-b text-center">{patient.입원유무}</td>
                                                <td className="py-3 px-4 border-b text-center">{patient.수술유무}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="py-4 text-center text-gray-500">
                                                {error ? '오류가 발생했습니다.' : '검색 결과가 없습니다. 검색어를 입력하고 검색 버튼을 눌러주세요.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


// --- MenuPage3 (설정 페이지) ---
function SettingsPage({ onGoToDashboard }) {
    return (
        <div className="p-8 min-h-screen bg-gray-50">
            <div className="w-full">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">예정이율 체크</h1>
                        <button onClick={onGoToDashboard} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                            대시보드로 돌아가기
                        </button>
                    </div>
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                        <p className="font-semibold">이곳은 설정과 관련된 기능을 구현할 공간입니다.</p>
                        <p>예: 비밀번호 변경, 알림 설정 등</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- MenuPage4 (추가 메뉴 1) ---
function ExtraMenu1({ onGoToDashboard }) {
    return (
        <div className="p-8 min-h-screen bg-gray-50">
            <div className="w-full">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">화재보험산정</h1>
                        <button onClick={onGoToDashboard} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                            대시보드로 돌아가기
                        </button>
                    </div>
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                        <p className="font-semibold">이곳은 '추가 메뉴 1'의 콘텐츠입니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- ExtraMenu2와 연결된 원수사 연락망 페이지 ---
function ContactPage({ onGoToDashboard }) {
    const [tab, setTab] = useState('sonhae');
    const [sonhae, setSonhae] = useState([]);
    const [saengmyeong, setSaengmyeong] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/contacts`);
                const data = await res.json();
                if (data.success) {
                    setSonhae(data.sonhae || []);
                    setSaengmyeong(data.saengmyeong || []);
                } else {
                    setError(data.message || '데이터를 불러오지 못했습니다.');
                }
            } catch (err) {
                console.error('원수사 연락망 가져오기 실패:', err);
                setError('서버 연결에 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchContacts();
    }, []);

    if (loading)
        return <div className="p-4 text-gray-600">📞 원수사 연락망을 불러오는 중...</div>;

    if (error)
        return (
            <div className="p-4 text-red-600">
                ⚠️ 오류: {error}
                <button
                    onClick={onGoToDashboard}
                    className="ml-3 px-3 py-1 bg-blue-500 text-white rounded"
                >
                    대시보드로 돌아가기
                </button>
            </div>
        );

    const currentList = tab === 'sonhae' ? sonhae : saengmyeong;
    if (!currentList.length)
        return (
            <div className="p-4 text-gray-600">
                <p>⚠️ 표시할 {tab === 'sonhae' ? '손해보험' : '생명보험'} 데이터가 없습니다.</p>
                <button
                    onClick={onGoToDashboard}
                    className="mt-3 px-3 py-1 bg-blue-500 text-white rounded"
                >
                    대시보드로 돌아가기
                </button>
            </div>
        );

    return (
        <div className="overflow-auto p-4">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">📋 원수사 연락망</h2>
                <button
                    onClick={onGoToDashboard}
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                    대시보드로 돌아가기
                </button>
            </div>

            {/* ✅ 탭 버튼 */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setTab('sonhae')}
                    className={`px-3 py-1 rounded ${tab === 'sonhae' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                >
                    손해보험
                </button>
                <button
                    onClick={() => setTab('saengmyeong')}
                    className={`px-3 py-1 rounded ${tab === 'saengmyeong' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                >
                    생명보험
                </button>
            </div>

            {/* ✅ 표 출력 */}
            <table className="table-auto border border-gray-300 w-full text-sm">
                <thead>
                    <tr className="bg-gray-200">
                        {Object.keys(currentList[0]).map((key) => (
                            <th key={key} className="border px-2 py-1 text-center whitespace-nowrap">
                                {key}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {currentList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            {Object.values(row).map((val, i) => (
                                <td key={i} className="border px-2 py-1 text-center whitespace-nowrap">
                                    {val || '-'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// --- MenuPage5 (추가 메뉴 2) ---
function ExtraMenu2({ onGoToDashboard }) {
    return (
        <div className="p-4">
            <ContactPage onGoToDashboard={onGoToDashboard} />
        </div>
    );
}




// --- MenuPage6 (추가 메뉴 3) ---
function ExtraMenu3({ onGoToDashboard }) {
    return (
        <div className="p-8 min-h-screen bg-gray-50">
            <div className="w-full">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">질병 인수데이터</h1>
                        <button onClick={onGoToDashboard} className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                            대시보드로 돌아가기
                        </button>
                    </div>
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                        <p className="font-semibold">이곳은 '추가 메뉴 3'의 콘텐츠입니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ===============================================
// 🚀 최상위 App 컴포넌트
// ===============================================
function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 

  useEffect(() => {
    const savedUserItem = localStorage.getItem('loggedInUser');
    if (savedUserItem) {
      const item = JSON.parse(savedUserItem);
      const now = new Date();
      if (now.getTime() > item.expiry) {
        localStorage.removeItem('loggedInUser');
      } else {
        setUser(item.user);
        setCurrentPage('dashboard');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (username, password) => {
    const data = await apiLogin(username, password);
    const now = new Date();
    const item = {
      user: data.user,
      expiry: now.getTime() + (60 * 60 * 1000), // 1 hour
    };
    localStorage.setItem('loggedInUser', JSON.stringify(item));
    setUser(data.user);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setUser(null);
    setCurrentPage('login');
  };
  
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleRegisterSuccess = () => {
      setShowRegisterModal(false); // 신청 모달 닫기
      setShowSuccessModal(true);   // 성공 모달 열기
  }

  const renderPage = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">세션을 확인 중입니다...</div>;
    }

    if (!user) {
        return (
            <>
                <LoginPage 
                    onLogin={handleLogin} 
                    onShowRegisterModal={() => setShowRegisterModal(true)} // LoginPage에 prop 전달
                />
                {/* ✨ 아이디 신청 모달 렌더링 */}
                {showRegisterModal && (
                    <RequestIdModal 
                        onClose={() => setShowRegisterModal(false)} 
                        onRegisterSuccess={handleRegisterSuccess} // 성공 시 호출될 함수 전달
                    />
                )}
                 {/* ✨ 신청 성공 메시지 모달 렌더링 */}
                {showSuccessModal && (
                    <SuccessModal 
                        onClose={() => setShowSuccessModal(false)}
                    />
                )}
            </>
        );
    }

    switch (currentPage) {
        case 'dashboard':
            return <DashboardPage 
                        user={user} 
                        onLogout={handleLogout} 
                        onGoToAdminPanel={() => setCurrentPage('adminPanel')}
                        onGoToMenuPage1={() => setCurrentPage('menuPage1')}
                        onGoToMenuPage2={() => setCurrentPage('menuPage2')}
                        onGoToSettings={() => setCurrentPage('settings')}
                        onGoToExtra1={() => setCurrentPage('extra1')}
                        onGoToExtra2={() => setCurrentPage('extra2')}
                        onGoToExtra3={() => setCurrentPage('extra3')}
                    />;
        case 'adminPanel':
            if (user.grade !== '최고 관리자') {
                setCurrentPage('dashboard');
                return <DashboardPage user={user} onLogout={handleLogout} onGoToAdminPanel={() => setCurrentPage('adminPanel')} onGoToMenuPage1={() => setCurrentPage('menuPage1')} onGoToMenuPage2={() => setCurrentPage('menuPage2')} onGoToSettings={() => setCurrentPage('settings')} onGoToExtra1={() => setCurrentPage('extra1')} onGoToExtra2={() => setCurrentPage('extra2')} onGoToExtra3={() => setCurrentPage('extra3')} />;
            }
            return <AdminPanelPage onGoToDashboard={() => setCurrentPage('dashboard')} />;
        case 'menuPage1':
            return <MenuPage1 onGoToDashboard={() => setCurrentPage('dashboard')} />;
        case 'menuPage2':
            return <MenuPage2 onGoToDashboard={() => setCurrentPage('dashboard')} />;
        case 'settings':
            return <SettingsPage onGoToDashboard={() => setCurrentPage('dashboard')} />;
        case 'extra1':
            return <ExtraMenu1 onGoToDashboard={() => setCurrentPage('dashboard')} />;
        case 'extra2':
            return <ExtraMenu2 onGoToDashboard={() => setCurrentPage('dashboard')} />;
        case 'extra3':
            return <ExtraMenu3 onGoToDashboard={() => setCurrentPage('dashboard')} />;
        default:
            handleLogout();
            return <LoginPage onLogin={handleLogin} onShowRegisterModal={() => setShowRegisterModal(true)} />; // 기본값 처리 시에도 모달 표시 함수 전달
    }
  };

  return (
    <div>
      {renderPage()}
    </div>
  );
}

export default App;
