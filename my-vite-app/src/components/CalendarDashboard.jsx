// 파일 위치: my-vite-app/src/components/CalendarDashboard.jsx

import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';

const BACKEND_URL = ''; // 배포 시 서버 주소 넣기

function CalendarDashboard({ username }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);

  // 선택한 날짜의 일정 가져오기
  const fetchSchedules = async (date) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/schedules`, {
        params: { username, date: date.toISOString() }
      });
      setSchedules(res.data);
    } catch (err) {
      console.error('일정 조회 실패:', err);
    }
  };

  useEffect(() => {
    fetchSchedules(selectedDate);
  }, [selectedDate]);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setTitle('');
    setDescription('');
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        // 수정
        await axios.put(`${BACKEND_URL}/api/schedules/${editingId}`, {
          title,
          description
        });
      } else {
        // 새 일정 추가
        await axios.post(`${BACKEND_URL}/api/schedules`, {
          username,
          title,
          description,
          date: selectedDate
        });
      }
      fetchSchedules(selectedDate);
      setTitle('');
      setDescription('');
      setEditingId(null);
    } catch (err) {
      console.error('일정 저장 실패:', err);
    }
  };

  const handleEdit = (schedule) => {
    setEditingId(schedule._id);
    setTitle(schedule.title);
    setDescription(schedule.description);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/schedules/${id}`);
      fetchSchedules(selectedDate);
    } catch (err) {
      console.error('일정 삭제 실패:', err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">캘린더</h2>
      <Calendar
        value={selectedDate}
        onChange={handleDateClick}
      />

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">
          {selectedDate.toLocaleDateString()} 일정
        </h3>

        {schedules.length > 0 ? (
          <ul className="mb-4">
            {schedules.map((sch) => (
              <li key={sch._id} className="flex justify-between items-center mb-2 p-2 border rounded">
                <span>
                  <strong>{sch.title}</strong>: {sch.description}
                </span>
                <div>
                  <button onClick={() => handleEdit(sch)} className="mr-2 px-2 py-1 bg-yellow-400 rounded text-white">수정</button>
                  <button onClick={() => handleDelete(sch._id)} className="px-2 py-1 bg-red-500 rounded text-white">삭제</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-gray-500">해당 날짜 일정이 없습니다.</p>
        )}

        <div className="mb-4">
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          <textarea
            placeholder="내용"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded">
            {editingId ? '수정 저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CalendarDashboard;
