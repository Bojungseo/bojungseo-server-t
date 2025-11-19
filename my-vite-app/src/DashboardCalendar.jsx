// src/DashboardCalendar.jsx
import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
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

const HOLIDAY_API_KEY =
  "c7745b47339ea22a7069fa3dae3aff8930f65da92c6dddf1e9e1a5948cba605c";

// 🔹 대한민국 국경일 + 공휴일 불러오기
async function fetchKoreanHolidays(year, month) {
  try {
    // 국경일
    const urlHoli = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo?solYear=${year}&solMonth=${String(month).padStart(2,"0")}&ServiceKey=${HOLIDAY_API_KEY}&_type=json`;
    const resHoli = await fetch(urlHoli);
    const jsonHoli = await resHoli.json();
    const itemsHoli = jsonHoli?.response?.body?.items?.item || [];

    // 공휴일
    const urlRest = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${year}&solMonth=${String(month).padStart(2,"0")}&ServiceKey=${HOLIDAY_API_KEY}&_type=json`;
    const resRest = await fetch(urlRest);
    const jsonRest = await resRest.json();
    const itemsRest = jsonRest?.response?.body?.items?.item || [];

    const allItems = [...itemsHoli, ...itemsRest];

    return allItems.map(h => ({
      title: `${h.dateName} (공휴일)`,
      start: `${h.locdate.toString().slice(0,4)}-${h.locdate.toString().slice(4,6)}-${h.locdate.toString().slice(6,8)}`,
      backgroundColor: "#EF4444",
      borderColor: "#EF4444",
      allDay: true,
      color: "#EF4444",
      id: `holiday-${h.locdate}`,
    }));

  } catch (e) {
    console.error("공휴일 API 오류:", e);
    return [];
  }
}

function DashboardCalendar() {
  const [events, setEvents] = useState([]);
  const [holidayEvents, setHolidayEvents] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    id: null,
    title: "",
    content: "",
    date: "",
    color: DEFAULT_COLORS[0],
  });
  const [customColor, setCustomColor] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  const [dateListModalOpen, setDateListModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState([]);

  const [calendarApi, setCalendarApi] = useState(null);
  const [currentYearMonth, setCurrentYearMonth] = useState("");

  // 필터 상태
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // 🔹 Firebase 로그인 체크
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user?.uid || null);
      if (!user?.uid) setEvents([]);
    });
    return () => unsub();
  }, []);

  // 🔹 Firestore 일정 불러오기
  useEffect(() => {
    if (!currentUserId) return;
    const q = query(collection(db, "events"), where("userId", "==", currentUserId));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setEvents(loaded);
    });
    return () => unsub();
  }, [currentUserId]);

  // 🔹 연월 + 공휴일 업데이트
  const updateYearMonth = async () => {
    if (!calendarApi) return;
    const date = calendarApi.getDate();
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    setCurrentYearMonth(`${y}년 ${m}월`);

    // 공휴일 가져오기
    const holidays = await fetchKoreanHolidays(y, m);
    setHolidayEvents(holidays);
  };

  // 🔹 날짜 클릭
  const handleDateClick = (info) => {
    const dateStr = info.dateStr;
    setSelectedDate(dateStr);

    const list = events.filter((e) => e.start === dateStr);
    setEventsForSelectedDate(list);

    setDateListModalOpen(true);
  };

  // 🔹 이벤트 클릭
  const handleEventClick = (info) => {
    const existing = events.find((e) => e.id === info.event.id);
    if (!existing) return;
    setModalData({
      id: existing.id,
      title: existing.title,
      content: existing.content || "",
      date: existing.start,
      color: existing.color || DEFAULT_COLORS[0],
    });
    setCustomColor("");
    setModalOpen(true);
  };

  // 🔹 일정 저장
  const handleSave = async () => {
    const colorToSave = customColor || modalData.color;
    try {
      if (modalData.id) {
        await updateDoc(doc(db, "events", modalData.id), {
          title: modalData.title,
          content: modalData.content,
          color: colorToSave,
        });
      } else {
        await addDoc(collection(db, "events"), {
          title: modalData.title,
          content: modalData.content,
          start: modalData.date,
          end: modalData.date,
          userId: currentUserId,
          allDay: true,
          color: colorToSave,
          createdAt: new Date(),
        });
      }
      setModalOpen(false);
      setDateListModalOpen(false);
    } catch (e) {
      alert("저장 실패");
    }
  };

  // 🔹 일정 삭제
  const handleDelete = async () => {
    if (!modalData.id) return;
    if (!window.confirm("삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "events", modalData.id));
    setModalOpen(false);
    setDateListModalOpen(false);
  };

  // 🔹 이벤트 Drag 이동
  const handleEventDrop = async (info) => {
    try {
      await updateDoc(doc(db, "events", info.event.id), {
        start: info.event.startStr,
        end: info.event.endStr || info.event.startStr,
      });
    } catch (e) {
      info.revert();
    }
  };

  // 필터 적용 이벤트
  const filteredEvents = events.filter((e) => {
    const keyword = searchKeyword.toLowerCase();
    const matchKeyword = e.title.toLowerCase().includes(keyword) || e.content?.toLowerCase().includes(keyword);
    if (!matchKeyword) return false;
    if (filterStartDate && e.start < filterStartDate) return false;
    if (filterEndDate && e.start > filterEndDate) return false;
    return true;
  });

  // 일정 추가 버튼
  const renderAddButton = () => (
    <button
      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 whitespace-nowrap"
      onClick={() => {
        setModalData({ id: null, title: "", content: "", date: "", color: DEFAULT_COLORS[0] });
        setCustomColor("");
        setModalOpen(true);
      }}
    >
      일정 추가
    </button>
  );

  return (
    <div className="bg-white p-4 rounded shadow">

      {/* 상단: 이동버튼 + 오늘 + 연월 + 일정추가 */}
      <div className="flex items-center justify-between mb-4 select-none">
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => { calendarApi.prev(); updateYearMonth(); }}>이전달</button>
          <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => { calendarApi.today(); updateYearMonth(); }}>오늘</button>
          <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => { calendarApi.next(); updateYearMonth(); }}>다음달</button>
        </div>
        <div className="text-xl font-bold text-center flex-grow">{currentYearMonth}</div>
        <div>{renderAddButton()}</div>
      </div>

      {/* 필터 영역 */}
      <div className="bg-gray-100 p-3 rounded mb-4 flex flex-wrap items-center gap-3">
        <input type="text" placeholder="검색 (제목/내용)" className="border p-2 rounded w-48"
          value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        <div className="flex items-center gap-2">
          <input type="date" className="border p-2 rounded" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          <span>~</span>
          <input type="date" className="border p-2 rounded" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
        </div>
        <button className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={() => { setSearchKeyword(""); setFilterStartDate(""); setFilterEndDate(""); }}>필터 초기화</button>
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
        events={[...filteredEvents, ...holidayEvents]}
        dayCellContent={(arg) => {
          const day = arg.date.getDay();
          let color = "";
          if (day === 0) color = "red";
          else if (day === 6) color = "blue";
          return { html: `<span style="color:${color}; font-weight:600">${arg.dayNumberText.replace("일","")}</span>` };
        }}
        datesSet={() => updateYearMonth()}
        ref={(ref) => { if (ref && !calendarApi) { setCalendarApi(ref.getApi()); setTimeout(updateYearMonth, 50); } }}
      />

      {/* 모달, 날짜 목록 모달 등 기존 코드 유지 */}
      {/* ...이전 답변 코드 그대로 유지, 생략 가능... */}
    </div>
  );
}

export default DashboardCalendar;
