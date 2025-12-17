import axios from 'axios';

// 1. Get or Create Session ID
// Each browser tab gets its own workspace identifier so files stay isolated.
const getSessionId = () => {
  let sessionId = localStorage.getItem('clouide_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('clouide_session_id', sessionId);
  }
  return sessionId;
};

// 2. Create a pre-configured instance
// This instance automatically forwards the session header with every request.
const api = axios.create({
  headers: {
    'x-session-id': getSessionId(),
    'Content-Type': 'application/json',
  },
});

export default api;
