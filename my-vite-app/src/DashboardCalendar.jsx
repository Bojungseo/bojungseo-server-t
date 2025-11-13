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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase"; // Firebase 초기화

function DashboardCalendar({ userName }) {
  const [events, setEvents] = useState([]);

  // ✅ 사용자 이름이 일치하는 컬렉션 실시간 구독
  useEffect(() => {
    if (!userName) return;

    console.log(`📡 Firestore 구독 시작: ${userName} 컬렉션`);
    const userCollectionRef = collection(db, userName);

    const unsubscribe = onSnapshot(userCollectionRef, (snapshot) => {
      const loadedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(loadedEvents);
    });

    return () => {
      console.log(`🧹 Firestore 구독 해제: ${userName}`);
      unsubscribe();
    };
  }, [userName]);

  // 📅 날짜 클릭 → 이벤트 추가
  const handleDateClick = async (info) => {
    if (!userName) {
      alert("로그인이 필요합니다.");
      return;
    }

    const title = prompt("이벤트 제목을 입력하세요:");
    if (!title) return;

    try {
      await addDoc(collection(db, userName), {
        title,
        start: info.dateStr,
        end: info.dateStr,
        allDay: true,
        createdAt: serverTimestamp(),
      });
      console.log(`✅ 이벤트 추가됨: ${title}`);
    } catch (err) {
      console.error("❌ 이벤트 추가 실패:", err);
      alert("이벤트 추가에 실패했습니다.");
    }
  };

  // 🗑️ 이벤트 클릭 → 삭제
  const handleEventClick = async (info) => {
    if (!userName) {
      alert("로그인이 필요합니다.");
      return;
    }

    const confirmDelete = window.confirm(
      `"${info.event.title}" 이벤트를 삭제하시겠습니까?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, userName, info.event.id));
      console.log(`🗑️ 이벤트 삭제됨: ${info.event.title}`);
    } catch (err) {
      console.error("❌ 이벤트 삭제 실패:", err);
      alert("삭제 실패");
    }
  };

  // ✋ 드래그 앤 드롭 → 날짜 변경
  const handleEventDrop = async (info) => {
    if (!userName) {
      alert("로그인이 필요합니다.");
      info.revert();
      return;
    }

    try {
      await updateDoc(doc(db, userName, info.event.id), {
        start: info.event.startStr,
        end: info.event.endStr || info.event.startStr,
      });
      console.log(`📆 캘린더 날짜 변경됨: ${info.event.title}`);
    } catch (err) {
      console.error("❌ 캘린더 날짜 변경 실패:", err);
      alert("캘린더 날짜 변경 실패");
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
