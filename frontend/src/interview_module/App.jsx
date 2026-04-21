import { useState, useEffect } from 'react';
import Header from './components/Header'; 
import Home from './components/Home';
import Setup from './components/Setup';
import Chat from './components/Chat';
import './styles/App.css'; 

function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); 
  const [sessionId, setSessionId] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [setupStep, setSetupStep] = useState(1);

  const handleStartSimulationClick = () => {
    setCurrentScreen('setup');
    setSetupStep(1); 
  };

  const handleSessionStart = (id, avatarObject) => {
    setSessionId(id);
    setSelectedAvatar(avatarObject); 
    setCurrentScreen('chat');
  };

  return (
    <div className="app-container">
      <Header currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />

      {(currentScreen === 'setup' || currentScreen === 'chat') && (
        <div className="stepper-container">
          
          {currentScreen === 'setup' ? (
            <>
              <span className={`stepper-item ${setupStep === 1 ? 'active' : ''}`}>1. CV & Role</span>
              <span className="stepper-separator">›</span>
              <span className={`stepper-item ${setupStep === 2 ? 'active' : ''}`}>2. Choose Avatar</span>
              <span className="stepper-separator">›</span>
              <span className={`stepper-item ${setupStep === 3 ? 'active' : ''}`}>3. Device Check & Start</span>
            </>
          ) : (
            <span style={{ visibility: 'hidden' }}>&nbsp;</span>
          )}
          
        </div>
      )}

      {currentScreen === 'home' && (
        <Home onStartSimulation={handleStartSimulationClick} />
      )}

      {currentScreen === 'setup' && (
        <div className="setup-page-content"> 
          <Setup onSessionStart={handleSessionStart} onStepChange={setSetupStep} />
        </div>
      )}

      {currentScreen === 'chat' && sessionId && (
        <div className="chat-page-content"> 
          <Chat sessionId={sessionId} avatarConfig={selectedAvatar} />
        </div>
      )}
    </div>
  );
}

export default App;