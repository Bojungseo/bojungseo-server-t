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
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase"; // Firebase 초기화

function DashboardCalendar({ username }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!username) return;

    // username 컬렉션 참조
    const userCollectionRef = collection(db, username);

    // 실시간 구독
    const unsubscribe = onSnapshot(userCollectionRef, (snapshot) => {
      const loaded = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(loaded);
    });

    return () => unsubscribe();
  }, [username]);

  // 날짜 클릭 → 이벤트 추가
  const handleDateClick = async (info) => {
    if (!username) {
      alert("로그인이 필요합니다.");
      return;
    }

    const title = prompt("이벤트 제목을 입력하세요:");
    if (!title) return;

    try {
      const userCollectionRef = collection(db, username);
      await addDoc(userCollectionRef, {
        title,
        start: info.dateStr,
        end: info.dateStr,
        allDay: true,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("이벤트 추가 실패:", err);
      alert("이벤트 추가에 실패했습니다.");
    }
  };

  // 이벤트 클릭 → 삭제
  const handleEventClick = async (info) => {
    if (!username) {
      alert("로그인이 필요합니다.");
      return;
    }

    const confirmDelete = window.confirm(`"${info.event.title}" 이벤트를 삭제하시겠습니까?`);
    if (!confirmDelete) return;

    try {
      const userCollectionRef = collection(db, username);
      await deleteDoc(doc(userCollectionRef, info.event.id));
    } catch (err) {
      console.error("이벤트 삭제 실패:", err);
      alert("삭제 실패");
    }
  };

  // 드래그 앤 드롭 → 날짜 변경
  const handleEventDrop = async (info) => {
    if (!username) {
      alert("로그인이 필요합니다.");
      info.revert();
      return;
    }

    try {
      const userCollectionRef = collection(db, username);
      await updateDoc(doc(userCollectionRef, info.event.id), {
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
        eventDrop={handleEventDrop}
      />
    </div>
  );
}

export default DashboardCalendar;
