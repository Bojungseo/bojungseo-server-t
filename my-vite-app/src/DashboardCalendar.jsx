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
  const [currentYearMonth, setCurrentYearMonth] = useState(""); // 연월 상태

  const [dateListModalOpen, setDateListModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState([]);

  // 🔹 Firebase Auth 체크
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user?.uid || null);
      if (!user?.uid) setEvents([]);
    });
    return () => unsubscribeAuth();
  }, []);

  // 🔹 Firestore 구독
  useEffect(() => {
    if (!currentUserId) return;
    const q = query(collection(db, "events"), where("userId", "==", currentUserId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(loaded);
    });
    return () => unsubscribe();
  }, [currentUserId]);

  // 🔹 기존 이벤트 클릭 → 수정 모달
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

  // 🔹 날짜 클릭 → 리스트 모달
  const handleDateClick = (info) => {
    const dateStr = info.dateStr;
    setSelectedDate(dateStr);
    const eventsForDay = events.filter(e => e.start === dateStr);
    setEventsForSelectedDate(eventsForDay);
    setDateListModalOpen(true);
  };

  // 🔹 이벤트 저장
  const handleSave = async () => {
    if (!currentUserId) { alert("관리자에게 이메일을 요청해주세요."); return; }
    if (!modalData.date) { alert("날짜를 선택해주세요."); return; }
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
    } catch (err) {
      console.error("저장 실패:", err);
      alert("일정 저장 실패");
    }
  };

  // 🔹 이벤트 삭제
  const handleDelete = async () => {
    if (!modalData.id) return;
    if (!window.confirm("일정을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "events", modalData.id));
      setModalOpen(false);
      setDateListModalOpen(false);
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제 실패");
    }
  };

  // 🔹 드래그 이동
  const handleEventDrop = async (info) => {
    if (!currentUserId) { alert("관리자에게 이메일을 요청해주세요."); info.revert(); return; }
    try {
      await updateDoc(doc(db, "events", info.event.id), {
        start: info.event.startStr,
        end: info.event.endStr || info.event.startStr,
      });
    } catch (err) {
      console.error("변경 실패:", err);
      info.revert();
    }
  };

  // 🔹 캘린더 우측 상단 일정추가 버튼
  const renderCustomAddButton = () => (
    <button
      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
      onClick={() => {
        setDateListModalOpen(false);
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
    <div className="bg-white p-4 rounded shadow relative">

      {!currentUserId && (
        <div className="p-4 mb-4 text-center text-red-600 font-semibold border border-red-300 rounded">
          관리자에게 이메일을 요청해주세요.
        </div>
      )}

      {/* 캘린더 중앙 정렬 */}
      <div className="flex justify-center relative">
        <div style={{ width: "100%", maxWidth: "1300px" }} className="relative">

          {/* 상단 연월 + 일정추가 버튼 */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-xl font-bold">{currentYearMonth}</div>
            <div>{renderCustomAddButton()}</div>
          </div>

          <FullCalendar
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
            headerToolbar={{
              left: "prev,next today",
              center: "",
              right: ""
            }}
            // 달 변경 시 연월 업데이트
            datesSet={(arg) => {
              const y = arg.start.getFullYear();
              const m = arg.start.getMonth() + 1;
              setCurrentYearMonth(`${y}년 ${m}월`);
            }}
            dayCellContent={(arg) => {
              const day = arg.date.getDay();
              let color = "";
              if (day === 0) color = "red";
              else if (day === 6) color = "blue";
              return { html: `<span style="color:${color}; font-weight:600">${arg.date.getDate()}</span>` };
            }}
          />

        </div>
      </div>

      {/* 일정 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">{modalData.id ? "일정 수정" : "새 일정"}</h2>

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

            <div className="mb-3">
              <span className="mr-2 font-semibold">색상 선택:</span>
              {DEFAULT_COLORS.map(c => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full mr-1 border-2 ${modalData.color === c ? "border-black" : "border-gray-300"}`}
                  onClick={() => { setModalData({ ...modalData, color: c }); setCustomColor(""); }}
                />
              ))}
            </div>

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

      {/* 날짜 클릭 리스트 모달 */}
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
                      color: e.color || DEFAULT_COLORS[0],
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
