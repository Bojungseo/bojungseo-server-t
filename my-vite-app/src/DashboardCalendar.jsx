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
import { db } from "./firebase";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function DashboardCalendar() {
  const [events, setEvents] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // ✅ 현재 로그인된 Firebase 사용자 감시
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        console.log("현재 로그인된 Firebase UID:", user.uid);
      } else {
        setCurrentUserId(null);
        console.log("Firebase 로그아웃 상태");
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // ✅ Firestore에서 현재 사용자 데이터 실시간 구독
  useEffect(() => {
    if (!currentUserId) return; // 로그인 안 되어있으면 실행 X

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

  // ✅ 날짜 클릭 → 새 이벤트 추가
  const handleDateClick = async (info) => {
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }

    const title = prompt("이벤트 제목을 입력하세요:");
    if (!title) return;

    await addDoc(collection(db, "events"), {
      title,
      start: info.dateStr,
      end: info.dateStr,
      userId: currentUserId, // 🔥 로그인한 사용자 UID 저장
      allDay: true,
    });
  };

  // ✅ 이벤트 클릭 → 삭제
  const handleEventClick = async (info) => {
    if (!currentUserId) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (window.confirm(`"${info.event.title}" 이벤트를 삭제하시겠습니까?`)) {
      await deleteDoc(doc(db, "events", info.event.id));
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold mb-2 text-gray-700">📅 나의 일정</h2>
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
