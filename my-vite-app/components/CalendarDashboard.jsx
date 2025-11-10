import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

function CalendarDashboard({ username }) {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // 서버에서 일정 불러오기
  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/schedules?username=${username}`);
      const data = await res.json();
      setEvents(
        data.schedules.map((item) => ({
          id: item._id,
          title: item.title,
          start: new Date(item.date),
          end: new Date(item.date),
          description: item.description,
        }))
      );
    } catch (err) {
      console.error("일정 불러오기 실패:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // 날짜 클릭
  const handleSelect = (slotInfo) => {
    const existing = events.find(
      (ev) => moment(ev.start).format("YYYY-MM-DD") === moment(slotInfo.start).format("YYYY-MM-DD")
    );
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description || "");
      setSelectedDate(existing.start);
    } else {
      setTitle("");
      setDescription("");
      setSelectedDate(slotInfo.start);
    }
  };

  // 일정 저장
  const handleSave = async () => {
    if (!title || !selectedDate) return alert("제목과 날짜를 입력해주세요.");

    const existing = events.find(
      (ev) => moment(ev.start).format("YYYY-MM-DD") === moment(selectedDate).format("YYYY-MM-DD")
    );

    const url = existing ? `/api/schedules/${existing.id}` : "/api/schedules";
    const method = existing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, title, description, date: selectedDate }),
      });
      if (res.ok) {
        fetchEvents();
        setTitle("");
        setDescription("");
        setSelectedDate(null);
      }
    } catch (err) {
      console.error("저장 실패:", err);
    }
  };

  return (
    <div className="mt-6">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        selectable
        onSelectSlot={handleSelect}
        onSelectEvent={(event) => handleSelect({ start: event.start })}
      />

      {selectedDate && (
        <div className="mt-4 p-4 border rounded bg-white shadow">
          <h3 className="font-semibold mb-2">일정 추가/수정: {moment(selectedDate).format("YYYY-MM-DD")}</h3>
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border px-2 py-1 w-full mb-2"
          />
          <textarea
            placeholder="내용"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border px-2 py-1 w-full mb-2"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            저장
          </button>
        </div>
      )}
    </div>
  );
}

export default CalendarDashboard;
