import React from 'react';

export default function Header({ currentScreen, setCurrentScreen }) {
  const isNavLinkActive = (screenName) => currentScreen === screenName;

  return (
    <header className="header-nav">
      <div className="logo-container">
        <img src="/logo.png" alt="careerGenie Logo" />
      </div>
      <nav className="nav-links">
        <a href="#" className={isNavLinkActive('home') ? 'active' : ''} onClick={() => setCurrentScreen('home')}>Home</a>
        <a href="#" className={isNavLinkActive('features') ? 'active' : ''} onClick={() => console.log('Features')}>Features</a>
        <a href="#" className={isNavLinkActive('how-it-works') ? 'active' : ''} onClick={() => console.log('How it works')}>How it works</a>
        <a href="#" className={isNavLinkActive('why-us') ? 'active' : ''} onClick={() => console.log('Why us')}>Why us</a>
      </nav>
      <button className="btn-get-started" onClick={() => setCurrentScreen('setup')}>Get Started</button>
    </header>
  );
}