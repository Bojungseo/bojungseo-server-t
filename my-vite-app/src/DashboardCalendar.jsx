function DashboardCalendar({ username }) {
  const [events, setEvents] = useState([]);

  // Firestore 실시간 구독
  useEffect(() => {
    if (!username) return; // username이 없으면 구독 중단

    const q = collection(db, username); // username 기반 컬렉션
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
      await addDoc(collection(db, username), {
        title,
        start: info.dateStr,
        end: info.dateStr,
        allDay: true,
        createdAt: new Date(),
        username, // 🔹 여기서 로그인한 username 기록
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
      await deleteDoc(doc(db, username, info.event.id)); // username 컬렉션 내 이벤트 삭제
    } catch (err) {
      console.error("이벤트 삭제 실패:", err);
      alert("삭제 실패");
    }
  };

  // 이벤트 드래그 → 날짜 변경
  const handleEventDrop = async (info) => {
    if (!username) {
      alert("로그인이 필요합니다.");
      info.revert();
      return;
    }

    try {
      await updateDoc(doc(db, username, info.event.id), {
        start: info.event.startStr,
        end: info.event.endStr || info.event.startStr,
        username, // 🔹 username 필드 유지
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
          username: e.username, // 🔹 FullCalendar 이벤트 객체에 username 추가
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
