// frontend/src/utils/api.ts
import axios from 'axios';

// 1. Get or Create Session ID
const getSessionId = () => {
  let sessionId = localStorage.getItem('clouide_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('clouide_session_id', sessionId);
  }
  return sessionId;
};

// 2. Create a pre-configured instance
const api = axios.create({
  headers: {
    'x-session-id': getSessionId(),
    'Content-Type': 'application/json',
  },
});

export default api;