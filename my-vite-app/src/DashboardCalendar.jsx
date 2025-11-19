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

function DashboardCalendar() {
  const [events, setEvents] = useState([]);

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

  // 🔹 필터 상태
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // 🔹 Auth 체크
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user?.uid || null);
      if (!user?.uid) setEvents([]);
    });
    return () => unsub();
  }, []);

  // 🔹 Firestore 일정 구독
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

  // 🔹 날짜 클릭 → 일정 목록 모달
  const handleDateClick = (info) => {
    const dateStr = info.dateStr;
    setSelectedDate(dateStr);

    const list = events.filter((e) => e.start === dateStr);
    setEventsForSelectedDate(list);

    setDateListModalOpen(true);
  };

  // 🔹 이벤트 클릭 → 수정
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

  // 🔹 Drag 이동
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

  // 🔹 캘린더 이동/오늘/초기 로딩 시 연월 반영
  const updateYearMonth = () => {
    if (!calendarApi) return;
    const date = calendarApi.getDate();
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    setCurrentYearMonth(`${y}년 ${m}월`);
  };

  // 🔹 필터 적용 결과
  const filteredEvents = events.filter((e) => {
    // 1. 검색 필터
    const keyword = searchKeyword.toLowerCase();
    const matchKeyword =
      e.title.toLowerCase().includes(keyword) ||
      e.content?.toLowerCase().includes(keyword);

    if (!matchKeyword) return false;

    // 2. 날짜 범위 필터
    if (filterStartDate && e.start < filterStartDate) return false;
    if (filterEndDate && e.start > filterEndDate) return false;

    return true;
  });

  // 일정 추가 버튼
  const renderAddButton = () => (
    <button
      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 whitespace-nowrap"
      onClick={() => {
        setModalData({
          id: null,
          title: "",
          content: "",
          date: "",
          color: DEFAULT_COLORS[0],
        });
        setCustomColor("");
        setModalOpen(true);
      }}
    >
      일정 추가
    </button>
  );

  return (
    <div className="bg-white p-4 rounded shadow">

      {/* ▲▲▲ 상단: 이동 버튼 + 오늘 + 연월 + 일정추가 ▲▲▲ */}
      <div className="flex items-center justify-between mb-4 select-none">

        {/* 왼쪽: 이동 버튼 */}
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => { calendarApi.prev(); updateYearMonth(); }}
          >
            ◀
          </button>

          <button
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => { calendarApi.today(); updateYearMonth(); }}
          >
            오늘
          </button>

          <button
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => { calendarApi.next(); updateYearMonth(); }}
          >
            ▶
          </button>
        </div>

        {/* 가운데: 연월 */}
        <div className="text-xl font-bold text-center flex-grow">
          {currentYearMonth}
        </div>

        {/* 오른쪽: 일정 추가 */}
        <div>{renderAddButton()}</div>
      </div>

      {/* ▼▼▼ 필터 영역 ▼▼▼ */}
      <div className="bg-gray-100 p-3 rounded mb-4 flex flex-wrap items-center gap-3">

        {/* 검색 */}
        <input
          type="text"
          placeholder="검색 (제목/내용)"
          className="border p-2 rounded w-48"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />

        {/* 날짜 범위 */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="border p-2 rounded"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />

          <span>~</span>

          <input
            type="date"
            className="border p-2 rounded"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>

        {/* 초기화 */}
        <button
          className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={() => {
            setSearchKeyword("");
            setFilterStartDate("");
            setFilterEndDate("");
          }}
        >
          필터 초기화
        </button>
      </div>

      {/* ▼▼▼ 캘린더 ▼▼▼ */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={false}   // ← 기본 헤더 완전히 제거!!!
        editable
        selectable
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        expandRows
        height="auto"
        contentHeight="auto"
        dayMaxEventRows={3}
        events={filteredEvents.map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          backgroundColor: e.color,
          borderColor: e.color,
        }))}

        dayCellContent={(arg) => {
          const day = arg.date.getDay();
          let color = "";
          if (day === 0) color = "red";
          else if (day === 6) color = "blue";

          return {
            html: `<span style="color:${color};">${arg.dayNumberText.replace("일", "")}</span>`,
          };
        }}

        datesSet={() => updateYearMonth()}
        ref={(ref) => {
          if (ref && !calendarApi) {
            setCalendarApi(ref.getApi());
            setTimeout(updateYearMonth, 50);
          }
        }}
      />

      {/* ▼▼▼ 일정 추가/수정 모달 ▼▼▼ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">
              {modalData.id ? "일정 수정" : "새 일정"}
            </h2>

            {!modalData.id && (
              <div className="mb-3">
                <label className="mr-2">날짜:</label>
                <input
                  type="date"
                  className="border p-2 rounded"
                  value={modalData.date}
                  onChange={(e) =>
                    setModalData({ ...modalData, date: e.target.value })
                  }
                />
              </div>
            )}

            <input
              type="text"
              placeholder="제목"
              className="w-full border p-2 rounded mb-3"
              value={modalData.title}
              onChange={(e) =>
                setModalData({ ...modalData, title: e.target.value })
              }
            />

            <textarea
              placeholder="내용"
              className="w-full border p-2 rounded mb-3 h-32"
              value={modalData.content}
              onChange={(e) =>
                setModalData({ ...modalData, content: e.target.value })
              }
            />

            <div className="mb-3">
              <span className="mr-2">색상:</span>
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full inline-block mr-1 border-2 ${
                    modalData.color === c ? "border-black" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setModalData({ ...modalData, color: c });
                    setCustomColor("");
                  }}
                />
              ))}
            </div>

            <div className="mb-3">
              <span className="mr-2">직접 선택:</span>
              <input
                type="color"
                className="w-10 h-8"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              {modalData.id && (
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded"
                  onClick={handleDelete}
                >
                  삭제
                </button>
              )}
              <button
                className="bg-gray-300 px-3 py-1 rounded"
                onClick={() => setModalOpen(false)}
              >
                취소
              </button>
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded"
                onClick={handleSave}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ▼ 날짜 클릭 일정 목록 모달 ▼ */}
      {dateListModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded shadow w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">
              {selectedDate} 일정
            </h2>

            <ul className="space-y-2 mb-4">
              {eventsForSelectedDate.length === 0 && (
                <li className="text-gray-500">등록된 일정이 없습니다.</li>
              )}

              {eventsForSelectedDate.map((e) => (
                <li
                  key={e.id}
                  className="p-2 rounded cursor-pointer text-white"
                  style={{ backgroundColor: e.color }}
                  onClick={() => {
                    setModalData({
                      id: e.id,
                      title: e.title,
                      content: e.content || "",
                      date: e.start,
                      color: e.color,
                    });
                    setModalOpen(true);
                    setDateListModalOpen(false);
                  }}
                >
                  {e.title}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 px-3 py-1 rounded"
                onClick={() => setDateListModalOpen(false)}
              >
                닫기
              </button>

              <button
                className="bg-blue-500 text-white px-3 py-1 rounded"
                onClick={() => {
                  setModalData({
                    id: null,
                    title: "",
                    content: "",
                    date: selectedDate,
                    color: DEFAULT_COLORS[0],
                  });
                  setCustomColor("");
                  setModalOpen(true);
                  setDateListModalOpen(false);
                }}
              >
                일정 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardCalendar;
