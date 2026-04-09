import axios from 'axios';

const API_CLIENT = axios.create({
  baseURL: 'http://127.0.0.1:8000', 
  headers: {
    'Content-Type': 'application/json', 
  },
});

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

export const startSession = async (cv_text, jd_text, voice_id) => {
  try {
    const response = await API_CLIENT.post('/start_session', {
      cv_text,
      jd_text,
      voice_id,
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

// Execute code via Piston
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

// upload recording to server
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
