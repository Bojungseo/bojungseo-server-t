import React, { useState, useEffect, useCallback } from 'react';

// =================================================================
// 📚 API Functions (백엔드와 통신하는 부분)
// =================================================================

// 백엔드 서버 주소를 환경 변수에서 가져오거나, 없을 경우 로컬 주소를 사용합니다.
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// API: 로그인
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

// ✨ API: 회원가입 신청 (새로 추가된 함수)
// 이 함수는 '/api/register' 주소로 새로운 아이디와 비밀번호를 전송합니다.
const apiRegister = async (username, password) => {
  console.log(`[Frontend] 백엔드로 회원가입 신청 전송: user=${username}`);
  const response = await fetch(`${BACKEND_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || '신청 실패');
  return data;
};

// API: 게시글 로딩 (아직은 가상 데이터 사용)
const mockApiFetchPosts = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        posts: [
          { id: 1, title: '첫 번째 공지사항입니다.' },
          { id: 2, title: 'React 프로젝트 구조에 대한 안내' },
          { id: 3, title: '서버 점검 예정 안내 (04:00 - 05:00)' },
        ],
      });
    }, 300);
  });
};


// =================================================================
// 📁 React Components (화면을 그리는 부분)
// =================================================================

// --- 아이디 신청 모달 컴포넌트 ---
function RequestIdModal({ onClose, onIdRequest }) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // '아이디 신청하기' 버튼을 눌렀을 때 실행되는 함수
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setMessage('아이디와 비밀번호를 모두 입력해주세요.');
      setIsSuccess(false);
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      // onIdRequest는 이제 실제 apiRegister 함수를 호출합니다.
      const result = await onIdRequest(newUsername, newPassword);
      setMessage(result.message); // 백엔드에서 온 성공 메시지를 표시
      setIsSuccess(true);
    } catch (error) {
      setMessage(error.message); // 백엔드에서 온 에러 메시지를 표시
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">아이디 신청하기</h2>
        {isSuccess ? (
          <div className="text-center">
            <p className="text-green-600 font-bold mb-4">{message}</p>
            <button
              onClick={onClose}
              className="w-full mt-3 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="new-username" className="block text-gray-700 text-sm font-bold mb-2">신청자 이름</label>
              <input
                id="new-username" type="text" value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="본인이름"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="new-password"  className="block text-gray-700 text-sm font-bold mb-2">사용할 비밀번호</label>
              <input
                id="new-password" type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="*************"
              />
            </div>
            <div className="flex flex-col items-center justify-between">
              <button
                type="submit" disabled={isLoading}
                className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:bg-gray-400"
              >
                {isLoading ? '신청 중...' : '아이디 신청하기'}
              </button>
              <button
                type="button" onClick={onClose}
                className="w-full mt-3 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
              >
                취소
              </button>
            </div>
            {message && <p className={`mt-4 text-center text-sm ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

// --- 로그인 페이지 컴포넌트 ---
function LoginPage({ onLogin, onIdRequest }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestIdModalOpen, setIsRequestIdModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {isRequestIdModalOpen && (
        <RequestIdModal
          onClose={() => setIsRequestIdModalOpen(false)}
          onIdRequest={onIdRequest}
        />
      )}
      <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-xl px-8 pt-6 pb-8 mb-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">로그인</h1>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">아이디</label>
          <input
            id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Username"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">비밀번호</label>
          <input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="******************"
          />
        </div>
        {error && <p className="text-red-500 text-xs italic mb-4 text-center">{error}</p>}
        <div className="flex flex-col items-center justify-between">
          <button
            type="submit" disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:bg-gray-400"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
          <button
            type="button" onClick={() => setIsRequestIdModalOpen(true)}
            className="w-full mt-3 bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded transition-colors duration-200"
          >
            아이디 신청하기
          </button>
        </div>
      </form>
    </div>
  );
}

// --- 대시보드 페이지 컴포넌트 ---
function DashboardPage({ user, onLogout }) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [posts, setPosts] = useState([]);
    const loginTime = new Date(user.loginTime);

    useEffect(() => {
      const timer = setInterval(() => {
        const seconds = Math.floor((new Date() - loginTime) / 1000);
        setElapsedTime(seconds);
      }, 1000);
      return () => clearInterval(timer);
    }, [loginTime]);
  
    useEffect(() => {
      mockApiFetchPosts().then(data => {
        if(data.success) setPosts(data.posts);
      });
    }, []);
  
    const formatElapsedTime = (seconds) => {
      const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    };
  
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
          <button onClick={onLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
            로그아웃
          </button>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-gray-500 text-sm font-bold">로그인 아이디</h3><p className="text-2xl font-semibold text-gray-800">{user.username}</p></div>
          <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-gray-500 text-sm font-bold">등급</h3><p className="text-2xl font-semibold text-blue-600">{user.grade}</p></div>
          <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-gray-500 text-sm font-bold">로그인 시간</h3><p className="text-2xl font-semibold text-gray-800">{loginTime.toLocaleString()}</p></div>
          <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-gray-500 text-sm font-bold">경과 시간</h3><p className="text-2xl font-semibold text-gray-800">{formatElapsedTime(elapsedTime)}</p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md"><h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-700">바로가기</h2><div className="flex flex-col space-y-3"><button className="text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-md transition-colors">메뉴 항목 1</button><button className="text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-md transition-colors">다른 기능 버튼</button><button className="text-left p-3 bg-gray-100 hover:bg-blue-100 rounded-md transition-colors">설정 페이지</button></div></div>
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md"><h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-700">최신 게시글</h2><ul className="space-y-3">{posts.map(post => (<li key={post.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">{post.title}</li>))}</ul></div>
        </div>
      </div>
    );
}

// --- 메인 App 컴포넌트 ---
export default function App() {
  const [user, setUser] = useState(null);

  const handleLogin = useCallback(async (username, password) => {
    const result = await apiLogin(username, password);
    if (result.success) setUser(result.user);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);
  
  // ✨ handleIdRequest가 이제 실제 apiRegister 함수를 호출합니다.
  const handleIdRequest = useCallback(async (username, password) => {
      // apiRegister는 Promise를 반환하므로, 그대로 반환하여
      // RequestIdModal에서 결과를 처리할 수 있도록 합니다.
      return await apiRegister(username, password);
  }, []);

  return (
    <main className="bg-gray-100 min-h-screen w-full flex flex-col justify-center items-center p-4">
      <style>{`.animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; } @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      {user ? (
        <DashboardPage user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} onIdRequest={handleIdRequest} />
      )}
    </main>
  );
}

