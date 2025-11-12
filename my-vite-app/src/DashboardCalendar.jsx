// src/DashboardCalendar.jsx
import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "./firebase"; // main.jsx와 같은 위치 기준

function DashboardCalendar({ userId }) {
  const [events, setEvents] = useState([]);

  // Firestore 실시간 구독 (userId별)
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "events"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(loaded);
    });
    return () => unsubscribe();
  }, [userId]);

  // 날짜 클릭 → 이벤트 추가
  const handleDateClick = async (info) => {
    const title = prompt("이벤트 제목을 입력하세요:");
    if (!title) return;
    await addDoc(collection(db, "events"), {
      title,
      start: info.dateStr,
      end: info.dateStr,
      userId,
      allDay: true
    });
  };

  // 이벤트 클릭 → 삭제
  const handleEventClick = async (info) => {
    if (window.confirm(`"${info.event.title}" 이벤트를 삭제하시겠습니까?`)) {
      await deleteDoc(doc(db, "events", info.event.id));
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
          right: "dayGridMonth,timeGridWeek,timeGridDay"
        }}
        events={events.map(e => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          allDay: e.allDay
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
