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
  const [newEventDate, setNewEventDate] = useState(""); // 새 이벤트 날짜 선택용
  const [currentUserId, setCurrentUserId] = useState(null);

  // 🔹 로그인 상태 확인 및 Firestore 실시간 구독
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user?.uid) {
        setCurrentUserId(user.uid);

        const q = query(collection(db, "events"), where("userId", "==", user.uid));
        const unsubscribeEvents = onSnapshot(q, (snapshot) => {
          const loaded = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setEvents(loaded);
        });

        return () => unsubscribeEvents();
      } else {
        setCurrentUserId(null);
        setEvents([]); // 로그인 안되면 이벤트 초기화
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 🔹 상단 "일정 추가" 버튼 클릭
  const handleAddButtonClick = () => {
    if (!currentUserId) return; // 로그인 안되면 모달 열지 않음
    setModalData({ id: null, title: "", content: "", date: newEventDate || "", color: DEFAULT_COLORS[0] });
    setCustomColor("");
    setModalOpen(true);
  };

  const handleEventClick = (info) => {
    if (!currentUserId) return; // 로그인 안되면 모달 열지 않음

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
    if (!currentUserId) return;
    const colorToSave = customColor || modalData.color;

    try {
      if (modalData.id) {
        await updateDoc(doc(db, "events", modalData.id), {
          title: modalData.title,
          content: modalData.content,
          color: colorToSave,
        });
      } else {
        if (!modalData.date) {
          alert("날짜를 선택해주세요.");
          return;
        }
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
      setNewEventDate("");
    } catch (err) {
      console.error("이벤트 저장 실패:", err);
      alert("이벤트 저장에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!currentUserId || !modalData.id) return;
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
    if (!currentUserId) {
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
      {/* 로그인 안되면 안내 메시지 표시 */}
      {!currentUserId ? (
        <div className="text-center p-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 font-semibold">
          관리자에게 이메일을 요청해주세요.
        </div>
      ) : (
        <div className="flex items-center mb-4 space-x-2">
          <input
            type="date"
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
            className="border p-2 rounded"
          />
          <button
            onClick={handleAddButtonClick}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            일정 추가
          </button>
        </div>
      )}

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
        eventClick={handleEventClick}
        editable={!!currentUserId}
        selectable={!!currentUserId}
        eventDrop={handleEventDrop}
      />

      {modalOpen && currentUserId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">{modalData.id ? "이벤트 수정" : "새 이벤트"}</h2>

            {!modalData.id && (
              <div className="mb-3">
                <label className="mr-2 font-semibold">날짜:</label>
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
              value={modalData.title}
              onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
              className="w-full border p-3 mb-3 rounded text-lg"
            />
            <textarea
              placeholder="내용"
              value={modalData.content}
              onChange={(e) => setModalData({ ...modalData, content: e.target.value })}
              className="w-full border p-3 mb-3 rounded text-lg h-[200px] resize-y"
            />
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
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-16 h-8 p-0 border rounded"
              />
            </div>
            <div className="flex justify-end space-x-2">
              {modalData.id && (
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
