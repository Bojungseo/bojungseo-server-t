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
} from "firebase/firestore";
import { db, auth } from "./firebase"; // Firebase 초기화

function DashboardCalendar() {
  const [events, setEvents] = useState([]);

  // Firestore 실시간 구독 (로그인한 사용자 이벤트만)
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

  // 날짜 클릭 → 이벤트 추가
  const handleDateClick = async (info) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }

    const title = prompt("이벤트 제목을 입력하세요:");
    if (!title) return;

    try {
      await addDoc(collection(db, "events"), {
        title,
        start: info.dateStr,
        end: info.dateStr,
        userId: currentUserId, // 🔥 로그인한 UID 저장
        allDay: true,
      });
    } catch (err) {
      console.error("이벤트 추가 실패:", err);
      alert("이벤트 추가에 실패했습니다.");
    }
  };

  // 이벤트 클릭 → 삭제
  const handleEventClick = async (info) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }

    const confirmDelete = window.confirm(
      `"${info.event.title}" 이벤트를 삭제하시겠습니까?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "events", info.event.id));
    } catch (err) {
      console.error("이벤트 삭제 실패:", err);
      alert("삭제 실패");
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
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
      />
    </div>
  );
}

export default DashboardCalendar;
