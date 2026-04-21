import axios from 'axios';

const API_CLIENT = axios.create({
  baseURL: 'http://127.0.0.1:8000', 
  headers: {
    'Content-Type': 'application/json', 
  },
});

const AUTH_API_CLIENT = axios.create({
  baseURL: 'http://localhost:5000/api', 
});

export const getExistingCv = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await AUTH_API_CLIENT.get('/profile/cv', {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'my_cv.pdf';
    if (contentDisposition && contentDisposition.includes('filename=')) {
      filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
    }

    return { blob: response.data, filename };
  } catch (error) {
    throw new Error('No existing CV found on your profile.');
  }
};

export const uploadCvPdf = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await API_CLIENT.post('/upload_cv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to upload and process CV PDF.');
  }
};

export const startSession = async (cv_text, jd_text, voice_id, job_role) => {
  try {
    const response = await API_CLIENT.post('/start_session', {
      cv_text,
      jd_text,
      voice_id,
      job_role,
    });
    return response.data.session_id;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to start session on the server.');
  }
};

export const postChatMessage = async (session_id, message) => {
  try {
    const response = await API_CLIENT.post('/chat', {
      session_id,
      message,
    });
    return response.data; 
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to get a response from the AI.');
  }
};

export const transcribeAudio = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');

    const response = await API_CLIENT.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.transcript;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to transcribe audio.');
  }
};

export const synthesizeSpeech = async (text) => {
  try {
    const response = await API_CLIENT.post(
      '/synthesize',
      { text }, 
      { responseType: 'blob' } 
    );
    return new Blob([response.data], { type: 'audio/wav' });
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to synthesize speech.');
  }
};

export const getInterviewFeedback = async (session_id) => {
  try {
    const response = await API_CLIENT.post('/get_feedback', { session_id });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch interview feedback.');
  }
};

export const executeCode = async ({ language, version, code, stdin = '' }) => {
  try {
    const response = await API_CLIENT.post('/execute_code', {
      language,
      version,
      code,
      stdin,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Code execution failed.');
  }
};

export const getPistonRuntimes = async () => {
  try {
    const response = await API_CLIENT.get('/piston_runtimes');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch supported languages.');
  }
};

export const uploadInterviewRecording = async (session_id, videoBlob) => {
  try {
    const formData = new FormData();
    formData.append('file', videoBlob, `${session_id}.webm`);

    const response = await API_CLIENT.post(`/upload_recording/${session_id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to upload interview recording:', error);
  }
};

export const saveInterviewResult = async (payload) => {
  try {
    const token = localStorage.getItem('token');

    const csrfRes = await fetch('/auth/csrf', { credentials: 'include' });
    if (!csrfRes.ok) throw new Error("Could not fetch CSRF token");
    const csrfData = await csrfRes.json();

    const response = await fetch('http://localhost:5000/api/interviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfData.csrfToken
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to save interview');
    }

    return await response.json();
  } catch (error) {
    console.error("Save Interview Error:", error);
    throw error;
  }
};

export const getInterviewHistory = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/interviews', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error("Failed to fetch history");
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const getInterviewDetail = async (id) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/interviews/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error("Failed to fetch detail");
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const deleteInterview = async (id) => {
  try {
    const token = localStorage.getItem('token');
    const csrfRes = await fetch('/auth/csrf', { credentials: 'include' });
    if (!csrfRes.ok) throw new Error("Could not fetch CSRF token");
    const csrfData = await csrfRes.json();

    const response = await fetch(`http://localhost:5000/api/interviews/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfData.csrfToken
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to delete interview');
    }

    return await response.json();
  } catch (error) {
    console.error("Delete Interview Error:", error);
    throw error;
  }
};

export const getAnalyticsData = async (timeframe, role) => {
  try {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (timeframe) params.append('timeframe', timeframe);
    if (role) params.append('role', role);

    const response = await fetch(`http://localhost:5000/api/interviews/analytics?${params.toString()}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });

    if (!response.ok) throw new Error("Failed to fetch analytics");
    return await response.json();
  } catch (error) {
    throw error;
  }
};