// src/DashboardCalendar.jsx
import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
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

  // 🔹 Firestore 실시간 구독
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
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
  }, []);

  const handleDateClick = (info) => {
    setModalData({ id: null, title: "", content: "", date: info.dateStr, color: DEFAULT_COLORS[0] });
    setCustomColor("");
    setModalOpen(true);
  };

  const handleEventClick = (info) => {
    const existingEvent = events.find((e) => e.id === info.event.id);
    if (!existingEvent) return;
    setModalData({
      id: existingEvent.id,
      title: existingEvent.title,
      content: existingEvent.content || "",
      date: existingEvent.start,
      color: existingEvent.color || DEFAULT_COLORS[0],
    });
    setCustomColor("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }

    const colorToSave = customColor || modalData.color;

    if (!modalData.title) {
      alert("제목을 입력해주세요.");
      return;
    }

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
      console.error("이벤트 저장 실패:", err);
      alert("이벤트 저장에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!modalData.id) return;
    if (!window.confirm("정말로 삭제하시겠습니까?")) return;

    try {
      await deleteDoc(doc(db, "events", modalData.id));
      setModalOpen(false);
    } catch (err) {
      console.error("이벤트 삭제 실패:", err);
      alert("삭제 실패");
    }
  };

  const handleEventDrop = async (info) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      info.revert();
      return;
    }

    try {
      await updateDoc(doc(db, "events", info.event.id), {
        start: info.event.startStr,
        end: info.event.endStr || info.event.startStr,
      });
    } catch (err) {
      console.error("이벤트 날짜 변경 실패:", err);
      alert("이벤트 날짜 변경 실패");
      info.revert();
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow relative">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          allDay: e.allDay,
          backgroundColor: e.color || DEFAULT_COLORS[0],
          borderColor: e.color || DEFAULT_COLORS[0],
        }))}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        editable={true}
        selectable={true}
        eventDrop={handleEventDrop}
      />

      {/* 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 overflow-auto">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl h-full max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">{modalData.id ? "이벤트 수정" : "새 이벤트"}</h2>
            <input
              type="text"
              placeholder="제목"
              value={modalData.title}
              onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
              className="w-full border p-3 mb-3 rounded text-lg"
            />
            <textarea
              placeholder="내용"
              value={modalData.content}
              onChange={(e) => setModalData({ ...modalData, content: e.target.value })}
              className="w-full border p-3 mb-3 rounded text-lg min-h-[120px]"
            />
            <div className="mb-3">
              <span className="mr-2 font-semibold">색상 선택:</span>
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full mr-2 border-2 ${
                    modalData.color === c ? "border-black" : "border-gray-300"
                  }`}
                  onClick={() => {
                    setModalData({ ...modalData, color: c });
                    setCustomColor("");
                  }}
                />
              ))}
            </div>
            <div className="mb-3 flex items-center">
              <span className="mr-2 font-semibold">커스텀 색상:</span>
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-16 h-10 p-0 border rounded"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              {modalData.id && (
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-lg"
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 text-lg"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-lg"
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
