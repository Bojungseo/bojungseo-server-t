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

  // 🔹 일정 추가 버튼
  const handleAddButtonClick = () => {
    setModalData({ id: null, title: "", content: "", date: "", color: DEFAULT_COLORS[0] });
    setCustomColor("");
    setModalOpen(true);
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

  // 🔹 이벤트 저장
  const handleSave = async () => {
    if (!currentUserId) {
      alert("관리자에게 이메일을 요청해주세요.");
      return;
    }

    if (!modalData.date) {
      alert("날짜를 선택해주세요.");
      return;
    }

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
    } catch (err) {
      console.error("저장 실패:", err);
      alert("이벤트 저장 실패");
    }
  };

  // 🔹 이벤트 삭제
  const handleDelete = async () => {
    if (!modalData.id) return;

    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      await deleteDoc(doc(db, "events", modalData.id));
      setModalOpen(false);
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제 실패");
    }
  };

  // 🔹 드래그 이동
  const handleEventDrop = async (info) => {
    if (!currentUserId) {
      alert("관리자에게 이메일을 요청해주세요.");
      info.revert();
      return;
    }

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

  return (
    <div className="bg-white p-4 rounded shadow relative">

      {/* UID 없음 안내 */}
      {!currentUserId && (
        <div className="p-4 mb-4 text-center text-red-600 font-semibold border border-red-300 rounded">
          관리자에게 이메일을 요청해주세요.
        </div>
      )}

      {/* 상단 버튼 (날짜 input 없음) */}
      <div className="flex items-center justify-end mb-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={!currentUserId}
          onClick={handleAddButtonClick}
        >
          일정 추가
        </button>
      </div>

      {/* 🔥 FullCalendar (크기 조절 적용) */}
      <div
        className="w-full rounded shadow bg-white overflow-auto"
        style={{
          maxHeight: "650px", // 최대 높이
          minHeight: "400px", // 최소 높이
        }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          editable={true}
          selectable={true}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          events={events.map((e) => ({
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
            center: "title",
            right: "" // 버튼 제거
          }}

          titleFormat={(date) => {
            const y = date.date.year;
            const m = date.date.month + 1;
            return `${y}년 ${m}월`;
          }}

          dayCellContent={(arg) => {
            const day = arg.date.getDay();
            let color = "";

            if (day === 0) color = "red"; // 일요일
            else if (day === 6) color = "blue"; // 토요일

            return {
              html: `<span style="color:${color}; font-weight:600">${arg.dayNumberText}</span>`
            };
          }}
        />
      </div>

      {/* 🔥 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 max-h-[80vh] overflow-y-auto">

            <h2 className="text-lg font-bold mb-3">
              {modalData.id ? "이벤트 수정" : "새 이벤트"}
            </h2>

            {/* 🔥 일정 추가 시에만 날짜 선택 UI 표시 */}
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
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full mr-1 border-2 ${
                    modalData.color === c ? "border-black" : "border-gray-300"
                  }`}
                  onClick={() => {
                    setModalData({ ...modalData, color: c });
                    setCustomColor("");
                  }}
                />
              ))}
            </div>

            <div className="mb-3">
              <span className="mr-2 font-semibold">커스텀 색상:</span>
              <input
                type="color"
                className="w-16 h-8 p-0 border rounded"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
              />
            </div>

            {/* 버튼 */}
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

    </div>
  );
}

export default DashboardCalendar;
