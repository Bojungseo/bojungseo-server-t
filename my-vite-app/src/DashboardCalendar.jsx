// src/DashboardCalendar.jsx
import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";

const DEFAULT_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#14B8A6", "#F472B6", "#FCD34D", "#A78BFA", "#60A5FA"
];

const HOLIDAY_API_KEY = "c7745b47339ea22a7069fa3dae3aff8930f65da92c6dddf1e9a1a5948cba605c";

const API_SERVICES = [
  { key: "getHoliDeInfo", label: "국경일", color: "#EF4444" },
  { key: "getRestDeInfo", label: "공휴일", color: "#FF7F50" },
  { key: "getAnniversaryInfo", label: "기념일", color: "#3B82F6" },
  { key: "get24DivisionsInfo", label: "24절기", color: "#10B981" },
  { key: "getSundryDayInfo", label: "잡절", color: "#F59E0B" },
];

function DashboardCalendar() {
  const [events, setEvents] = useState([]);
  const [specialDayMap, setSpecialDayMap] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ id: null, title: "", content: "", date: "", color: DEFAULT_COLORS[0] });
  const [customColor, setCustomColor] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [dateListModalOpen, setDateListModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState([]);
  const [calendarApi, setCalendarApi] = useState(null);
  const [currentYearMonth, setCurrentYearMonth] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // ---------------------------
  // Firebase Auth 체크
  // ---------------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user?.uid || null);
      if (!user?.uid) setEvents([]);
    });
    return () => unsub();
  }, []);

  // ---------------------------
  // Firestore 일정 구독
  // ---------------------------
  useEffect(() => {
    if (!currentUserId) return;
    const q = query(collection(db, "events"), where("userId", "==", currentUserId));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(loaded);
    });
    return () => unsub();
  }, [currentUserId]);

  // ---------------------------
  // 공휴일/특일/기념일/24절기/잡절 가져오기
  // ---------------------------
  const fetchSpecialDays = async (year, month) => {
    const map = {};
    for (const service of API_SERVICES) {
      try {
        const res = await axios.get(`https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/${service.key}`, {
          params: {
            ServiceKey: HOLIDAY_API_KEY,
            solYear: year,
            solMonth: String(month).padStart(2, "0"),
            _type: "json"
          }
        });
        const items = res.data.response?.body?.items?.item || [];
        items.forEach(h => {
          const dateStr = `${h.locdate.toString().slice(0,4)}-${h.locdate.toString().slice(4,6)}-${h.locdate.toString().slice(6,8)}`;
          if (!map[dateStr]) map[dateStr] = [];
          map[dateStr].push({ name: h.dateName, color: service.color });
        });
      } catch (err) {
        console.error(`${service.label} 조회 실패:`, err);
      }
    }
    setSpecialDayMap(map);
  };

  // ---------------------------
  // 연월 업데이트 및 특일 로드
  // ---------------------------
  const updateYearMonth = async () => {
    if (!calendarApi) return;
    const date = calendarApi.getDate();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    setCurrentYearMonth(`${year}년 ${month}월`);
    await fetchSpecialDays(year, month);
  };

  // ---------------------------
  // 날짜 클릭 → 일정 목록 모달
  // ---------------------------
  const handleDateClick = (info) => {
    const dateStr = info.dateStr;
    setSelectedDate(dateStr);
    const list = events.filter(e => e.start === dateStr);
    setEventsForSelectedDate(list);
    setDateListModalOpen(true);
  };

  // ---------------------------
  // 이벤트 클릭 → 수정
  // ---------------------------
  const handleEventClick = (info) => {
    const existing = events.find(e => e.id === info.event.id);
    if (!existing) return;
    setModalData({ id: existing.id, title: existing.title, content: existing.content || "", date: existing.start, color: existing.color || DEFAULT_COLORS[0] });
    setCustomColor("");
    setModalOpen(true);
  };

  // ---------------------------
  // 일정 저장
  // ---------------------------
  const handleSave = async () => {
    const colorToSave = customColor || modalData.color;
    try {
      if (modalData.id) {
        await updateDoc(doc(db, "events", modalData.id), { title: modalData.title, content: modalData.content, color: colorToSave });
      } else {
        await addDoc(collection(db, "events"), { title: modalData.title, content: modalData.content, start: modalData.date, end: modalData.date, userId: currentUserId, allDay: true, color: colorToSave, createdAt: new Date() });
      }
      setModalOpen(false);
      setDateListModalOpen(false);
    } catch (e) {
      alert("저장 실패");
    }
  };

  // ---------------------------
  // 일정 삭제
  // ---------------------------
  const handleDelete = async () => {
    if (!modalData.id) return;
    if (!window.confirm("삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "events", modalData.id));
    setModalOpen(false);
    setDateListModalOpen(false);
  };

  // ---------------------------
  // Drag 이동
  // ---------------------------
  const handleEventDrop = async (info) => {
    try {
      await updateDoc(doc(db, "events", info.event.id), { start: info.event.startStr, end: info.event.endStr || info.event.startStr });
    } catch (e) {
      info.revert();
    }
  };

  // ---------------------------
  // 필터 적용
  // ---------------------------
  const filteredEvents = events.filter(e => {
    const keyword = searchKeyword.toLowerCase();
    const matchKeyword = e.title.toLowerCase().includes(keyword) || e.content?.toLowerCase().includes(keyword);
    if (!matchKeyword) return false;
    if (filterStartDate && e.start < filterStartDate) return false;
    if (filterEndDate && e.start > filterEndDate) return false;
    return true;
  });

  const renderAddButton = () => (
    <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 whitespace-nowrap"
      onClick={() => { setModalData({ id: null, title: "", content: "", date: "", color: DEFAULT_COLORS[0] }); setCustomColor(""); setModalOpen(true); }}>
      일정 추가
    </button>
  );

  return (
    <div className="bg-white p-4 rounded shadow">
      {/* 상단: 이전/오늘/다음달 + 연월 + 일정추가 */}
      <div className="flex items-center justify-between mb-4 select-none">
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => { calendarApi.prev(); updateYearMonth(); }}>이전달</button>
          <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => { calendarApi.today(); updateYearMonth(); }}>오늘</button>
          <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => { calendarApi.next(); updateYearMonth(); }}>다음달</button>
        </div>
        <div className="text-xl font-bold text-center flex-grow">{currentYearMonth}</div>
        <div>{renderAddButton()}</div>
      </div>

      {/* 필터 */}
      <div className="bg-gray-100 p-3 rounded mb-4 flex flex-wrap items-center gap-3">
        <input type="text" placeholder="검색 (제목/내용)" className="border p-2 rounded w-48" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        <div className="flex items-center gap-2">
          <input type="date" className="border p-2 rounded" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          <span>~</span>
          <input type="date" className="border p-2 rounded" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
        </div>
        <button className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={() => { setSearchKeyword(""); setFilterStartDate(""); setFilterEndDate(""); }}>필터 초기화</button>
      </div>

      {/* 캘린더 */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={false}
        editable
        selectable
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        expandRows
        height="auto"
        contentHeight="auto"
        dayMaxEventRows={3}
        events={filteredEvents}
        dayCellContent={(arg) => {
          const dateStr = arg.date.toISOString().slice(0,10);
          const specials = specialDayMap[dateStr] || [];
          const day = arg.date.getDay();
          let color = "";
          if (day === 0) color = "red";
          else if (day === 6) color = "blue";

          const specialsHtml = specials.slice(0,2).map(s => `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.65rem; color:${s.color};">${s.name}</div>`).join("");
          return {
            html: `<div style="display:flex; align-items:center;">
                      <div style="width:50px; display:flex; flex-direction:column; gap:1px;">${specialsHtml}</div>
                      <div style="flex-grow:1; text-align:right; font-weight:600; color:${color};">${arg.dayNumberText}</div>
                   </div>`
          };
        }}
        datesSet={() => updateYearMonth()}
        ref={(ref) => { if (ref && !calendarApi) { const api = ref.getApi(); setCalendarApi(api); setTimeout(() => updateYearMonth(), 50); } }}
      />

      {/* 일정 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">{modalData.id ? "일정 수정" : "새 일정"}</h2>

            {!modalData.id && (
              <div className="mb-3">
                <label className="mr-2">날짜:</label>
                <input type="date" className="border p-2 rounded" value={modalData.date} onChange={(e) => setModalData({ ...modalData, date: e.target.value })} />
              </div>
            )}

            <input type="text" placeholder="제목" className="w-full border p-2 rounded mb-3" value={modalData.title} onChange={(e) => setModalData({ ...modalData, title: e.target.value })} />
            <textarea placeholder="내용" className="w-full border p-2 rounded mb-3 h-32" value={modalData.content} onChange={(e) => setModalData({ ...modalData, content: e.target.value })} />

            <div className="mb-3">
              <span className="mr-2">색상:</span>
              {DEFAULT_COLORS.map((c) => (
                <button key={c} className={`w-6 h-6 rounded-full inline-block mr-1 border-2 ${modalData.color === c ? "border-black" : "border-gray-300"}`} style={{ backgroundColor: c }} onClick={() => { setModalData({ ...modalData, color: c }); setCustomColor(""); }} />
              ))}
            </div>

            <div className="mb-3">
              <span className="mr-2">직접 선택:</span>
              <input type="color" className="w-10 h-8" value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2">
              {modalData.id && <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={handleDelete}>삭제</button>}
              <button className="bg-gray-300 px-3 py-1 rounded" onClick={() => setModalOpen(false)}>취소</button>
              <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={handleSave}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 날짜 클릭 일정 목록 모달 */}
      {dateListModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded shadow w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">{selectedDate} 일정</h2>

            <ul className="space-y-2 mb-4">
              {eventsForSelectedDate.length === 0 && <li className="text-gray-500">등록된 일정이 없습니다.</li>}
              {eventsForSelectedDate.map((e) => (
                <li key={e.id} className="p-2 rounded cursor-pointer text-white" style={{ backgroundColor: e.color }} onClick={() => { setModalData({ ...e }); setModalOpen(true); setDateListModalOpen(false); }}>
                  {e.title}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-2">
              <button className="bg-gray-300 px-3 py-1 rounded" onClick={() => setDateListModalOpen(false)}>닫기</button>
              <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={() => { setModalData({ id: null, title: "", content: "", date: selectedDate, color: DEFAULT_COLORS[0] }); setCustomColor(""); setModalOpen(true); setDateListModalOpen(false); }}>일정 추가</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardCalendar;
