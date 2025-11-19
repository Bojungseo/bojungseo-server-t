// src/DashboardCalendar.jsx
import React, { useEffect, useState, useRef } from "react";
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
  "#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6",
  "#14B8A6","#F472B6","#FCD34D","#A78BFA","#60A5FA"
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

  // 날짜 리스트 모달
  const [dateListModalOpen, setDateListModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState([]);

  // 연월 저장
  const [currentYearMonth, setCurrentYearMonth] = useState("");

  // FullCalendar ref
  const calendarRef = useRef(null);

  // ---------------------- AUTH ------------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user?.uid || null);
      if (!user?.uid) setEvents([]);
    });
    return () => unsub();
  }, []);

  // ---------------------- FIRESTORE -------------------
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

  // ---------------------- 날짜 클릭 -------------------
  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
    const daily = events.filter((e) => e.start === info.dateStr);
    setEventsForSelectedDate(daily);
    setDateListModalOpen(true);
  };

  // ---------------------- 이벤트 클릭 -------------------
  const handleEventClick = (info) => {
    const e = events.find((x) => x.id === info.event.id);
    if (!e) return;
    setModalData({
      id: e.id,
      title: e.title,
      content: e.content || "",
      date: e.start,
      color: e.color,
    });
    setCustomColor("");
    setModalOpen(true);
  };

  // ---------------------- 저장 -------------------
  const handleSave = async () => {
    if (!currentUserId) return alert("관리자에게 이메일을 요청해주세요.");
    if (!modalData.date) return alert("날짜를 선택해주세요.");

    const saveColor = customColor || modalData.color;

    try {
      if (modalData.id) {
        await updateDoc(doc(db, "events", modalData.id), {
          title: modalData.title,
          content: modalData.content,
          color: saveColor,
        });
      } else {
        await addDoc(collection(db, "events"), {
          title: modalData.title,
          content: modalData.content,
          start: modalData.date,
          end: modalData.date,
          userId: currentUserId,
          allDay: true,
          color: saveColor,
          createdAt: new Date(),
        });
      }

      setModalOpen(false);
      setDateListModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------- 삭제 -------------------
  const handleDelete = async () => {
    if (!modalData.id) return;
    if (!window.confirm("삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "events", modalData.id));
      setModalOpen(false);
      setDateListModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------- 드래그 이동 -------------------
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

  // ---------------------- 달 이동 버튼 -------------------
  const handlePrev = () => calendarRef.current.getApi().prev();
  const handleNext = () => calendarRef.current.getApi().next();
  const handleToday = () => calendarRef.current.getApi().today();

  // ---------------------- 일정추가 버튼 -------------------
  const openAddModal = () => {
    setModalData({
      id: null,
      title: "",
      content: "",
      date: "",
      color: DEFAULT_COLORS[0],
    });
    setCustomColor("");
    setModalOpen(true);
  };
  return (
    <div className="bg-white p-4 rounded shadow relative">

      {/* 🔹 로그인 안내 */}
      {!currentUserId && (
        <div className="p-4 mb-4 text-center text-red-600 font-semibold border border-red-300 rounded">
          관리자에게 이메일을 요청해주세요.
        </div>
      )}

      {/* 🔹 상단 컨트롤바 (월 이동버튼 + Today + 연월 + 일정추가 버튼) */}
      <div className="flex items-center justify-between mb-4 px-2">

        {/* ▶ 좌측: prev / today / next */}
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">◀</button>
          <button onClick={handleToday} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Today</button>
          <button onClick={handleNext} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">▶</button>
        </div>

        {/* ▶ 가운데: 연월 표시 */}
        <div className="text-xl font-bold text-center flex-1">
          {currentYearMonth}
        </div>

        {/* ▶ 우측: 일정 추가 버튼 */}
        <div>
          <button
            onClick={openAddModal}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            일정 추가
          </button>
        </div>
      </div>

      {/* 🔹 캘린더 */}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        editable={true}
        selectable={true}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        expandRows={true}
        height="auto"
        contentHeight="auto"
        dayMaxEventRows={3}
        events={events.map(e => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          backgroundColor: e.color,
          borderColor: e.color,
          allDay: true,
        }))}

        /* 🔹 달 변경될 때 실행됨 → 연월 저장 */
        datesSet={(info) => {
          const y = info.view.currentStart.getFullYear();
          const m = info.view.currentStart.getMonth() + 1;
          setCurrentYearMonth(`${y}년 ${m}월`);
        }}

        /* 🔹 요일 색 적용 + 숫자만 출력 */
        dayCellContent={(arg) => {
          const day = arg.date.getDay();
          let color = "";
          if (day === 0) color = "red";      // 일요일
          else if (day === 6) color = "blue"; // 토요일

          return {
            html: `<span style="color:${color}; font-weight:600">${arg.date.getDate()}</span>`
          };
        }}
      />

      {/* --------------------------------------------- */}
      {/*            일정 추가/수정 모달                */}
      {/* --------------------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">{modalData.id ? "일정 수정" : "새 일정"}</h2>

            {/* 날짜 선택 (신규일정 작성 시만) */}
            {!modalData.id && (
              <div className="mb-3">
                <label className="mr-2 font-semibold">날짜 선택:</label>
                <input
                  type="date"
                  value={modalData.date}
                  onChange={(e) => setModalData({ ...modalData, date: e.target.value })}
                  className="border p-2 rounded"
                />
              </div>
            )}

            <input
              type="text"
              placeholder="제목"
              className="w-full border p-3 mb-3 rounded text-lg"
              value={modalData.title}
              onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
            />

            <textarea
              placeholder="내용"
              className="w-full border p-3 mb-3 rounded text-lg h-[200px] resize-y"
              value={modalData.content}
              onChange={(e) => setModalData({ ...modalData, content: e.target.value })}
            />

            {/* 색상 선택 */}
            <div className="mb-3">
              <span className="mr-2 font-semibold">색상 선택:</span>
              {DEFAULT_COLORS.map(c => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full mr-1 border-2 ${
                    modalData.color === c ? "border-black" : "border-gray-300"
                  }`}
                  onClick={() => { setModalData({ ...modalData, color: c }); setCustomColor(""); }}
                />
              ))}
            </div>

            {/* 직접 색상 지정 */}
            <div className="mb-3">
              <span className="mr-2 font-semibold">직접 색상지정:</span>
              <input
                type="color"
                className="w-16 h-8 p-0 border rounded"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              {modalData.id && (
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={handleDelete}
                >
                  삭제
                </button>
              )}
              <button
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => setModalOpen(false)}
              >
                취소
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={handleSave}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------- */}
      {/*              날짜 클릭 리스트 모달            */}
      {/* --------------------------------------------- */}
      {dateListModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-40">
          <div className="bg-white p-6 rounded shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">{selectedDate} 일정</h2>

            <ul className="space-y-2 mb-4">
              {eventsForSelectedDate.length === 0 && (
                <li className="text-gray-500">등록된 일정이 없습니다.</li>
              )}
              {eventsForSelectedDate.map((e) => (
                <li
                  key={e.id}
                  className="p-2 border rounded cursor-pointer hover:bg-gray-100"
                  style={{ backgroundColor: e.color, color: "#fff" }}
                  onClick={() => {
                    setModalData({
                      id: e.id,
                      title: e.title,
                      content: e.content || "",
                      date: e.start,
                      color: e.color,
                    });
                    setCustomColor("");
                    setModalOpen(true);
                    setDateListModalOpen(false);
                  }}
                >
                  {e.title}
                </li>
              ))}
            </ul>

            <div className="flex justify-end space-x-2">
              <button
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => setDateListModalOpen(false)}
              >
                닫기
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
