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

function DashboardCalendar() {
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ id: null, title: "", content: "", date: "" });

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

  // 🔹 날짜 클릭 → 모달 열기 (새 이벤트)
  const handleDateClick = (info) => {
    setModalData({ id: null, title: "", content: "", date: info.dateStr });
    setModalOpen(true);
  };

  // 🔹 이벤트 클릭 → 모달 열기 (수정/삭제)
  const handleEventClick = (info) => {
    const existingEvent = events.find((e) => e.id === info.event.id);
    if (!existingEvent) return;
    setModalData({
      id: existingEvent.id,
      title: existingEvent.title,
      content: existingEvent.content || "",
      date: existingEvent.start,
    });
    setModalOpen(true);
  };

  // 🔹 모달 저장
  const handleSave = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      if (modalData.id) {
        // 수정
        await updateDoc(doc(db, "events", modalData.id), {
          title: modalData.title,
          content: modalData.content,
        });
      } else {
        // 새로 추가
        await addDoc(collection(db, "events"), {
          title: modalData.title,
          content: modalData.content,
          start: modalData.date,
          end: modalData.date,
          userId: currentUserId,
          allDay: true,
          createdAt: new Date(),
        });
      }
      setModalOpen(false);
    } catch (err) {
      console.error("이벤트 저장 실패:", err);
      alert("이벤트 저장에 실패했습니다.");
    }
  };

  // 🔹 모달 삭제
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

  // 🔹 드래그앤드롭
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
        }))}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        editable={true}
        selectable={true}
        eventDrop={handleEventDrop}
      />

      {/* 🔹 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-80">
            <h2 className="text-lg font-bold mb-2">{modalData.id ? "이벤트 수정" : "새 이벤트"}</h2>
            <input
              type="text"
              placeholder="제목"
              value={modalData.title}
              onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
              className="w-full border p-2 mb-2 rounded"
            />
            <textarea
              placeholder="내용"
              value={modalData.content}
              onChange={(e) => setModalData({ ...modalData, content: e.target.value })}
              className="w-full border p-2 mb-2 rounded"
            />
            <div className="flex justify-end space-x-2">
              {modalData.id && (
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
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
