import { useState, useEffect, useCallback, useRef } from 'react';
import { postChatMessage, getInterviewFeedback } from '../api/interviewService';

export const useChat = (sessionId) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);
  const greetingFetched = useRef(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);


  const fetchFeedback = useCallback(async () => {
    if (!sessionId) return;
    setIsFeedbackLoading(true);
    try {
      const feedback = await getInterviewFeedback(sessionId);
      setFeedbackData(feedback);
    } catch (err) {
      console.error("useChat: Failed to fetch feedback", err);
      setFeedbackData({
        error: `Failed to load feedback: ${err.message}`
      });
    } finally {
      setIsFeedbackLoading(false);
    }
  }, [sessionId]);

  const getAiResponse = useCallback(async (userMessage) => {
    setIsLoading(true);
    setError(null);
    try {
      const aiData = await postChatMessage(sessionId, userMessage);
      
      setMessages((prev) => [...prev, { sender: 'ai', text: aiData.response }]);

      if (aiData.is_complete) {
        setIsInterviewFinished(true);
      }
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `Sorry, an error occurred: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && !greetingFetched.current) {
      greetingFetched.current = true;
      getAiResponse('Hello, I am ready to start the interview.'); 
    }
  }, [sessionId, getAiResponse]);

  const sendMessage = useCallback(
    (messageText) => {
      if (!messageText.trim()) return;
      setMessages((prev) => [...prev, { sender: 'user', text: messageText }]);
      getAiResponse(messageText);
    },
    [getAiResponse]
  );

  return { 
    messages, 
    isLoading, 
    sendMessage, 
    isInterviewFinished,
    feedbackData,
    isFeedbackLoading,
    fetchFeedback
  };
};