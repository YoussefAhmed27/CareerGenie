const LoadingDots = () => (
  <div className="loading-dots">
    <div className="dot"></div>
    <div className="dot"></div>
    <div className="dot"></div>
  </div>
);


export default function Message({ sender, text, isLoading, isSpeaking }) {
  const isUser = sender === 'user';
  
  const messageClass = `message ${isUser ? 'user-message' : 'ai-message'} ${isSpeaking ? 'is-speaking' : ''}`;

  return (
    <div className={messageClass}>
      {isLoading ? <LoadingDots /> : text}
    </div>
  );
}