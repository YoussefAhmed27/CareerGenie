// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { LayoutGrid, Plus, Settings, X, Menu, ChevronRight, Search } from 'lucide-react';
import { Avatar } from './HrUIComponents';

export const Sidebar = ({ activeView, setView, isMobileOpen, setIsMobileOpen, workspaceName }: any) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'create-job', label: 'Post Job', icon: Plus },
    { id: 'settings', label: 'Workspace', icon: Settings },
  ];

  const hrUser = JSON.parse(localStorage.getItem('hr_user') || '{}');
  const userName = hrUser.full_name || 'HR User';
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#0B0C1E] border-r border-white/5 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        <div className="h-16 flex items-center px-6 border-b border-white/5 justify-between">
          <img src="/logo.png" alt="CareerGenie HR Logo" className="h-6 object-contain cursor-pointer" onClick={() => setView('dashboard')} />
          <button className="md:hidden text-gray-400" onClick={() => setIsMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-1 overflow-y-auto flex-1">
          {items.map(item => (
            <button key={item.id}
              onClick={() => { setView(item.id); setIsMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeView === item.id
                  ? 'bg-[#22d3ee]/10 text-[#22d3ee]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <Avatar initials={initials} size="sm" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{workspaceName || 'My Workspace'}</p>
              <p className="text-xs text-gray-500 truncate">{userName}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export const Topbar = ({ title, onMenuClick, globalSearch = '', setGlobalSearch, onSettingsClick }: any) => (
  <header className="h-16 bg-[#0B0C1E]/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 md:left-64 z-30">
    <div className="flex items-center gap-3 overflow-hidden">
      <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white">
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2 text-sm text-gray-400 whitespace-nowrap">
        <span className="hidden sm:inline">Workspace</span>
        <ChevronRight size={14} className="hidden sm:block" />
        <span className="text-white font-medium truncate">{title}</span>
      </div>
    </div>
    <div className="flex items-center gap-3 md:gap-4">
      <div className="hidden md:flex bg-[#151632] border border-white/10 rounded-full px-4 py-1.5 items-center gap-2 w-48 lg:w-64">
        <Search size={14} className="text-gray-500 flex-shrink-0" />
        <input 
          type="text" 
          placeholder="Search..." 
          className="bg-transparent border-none outline-none text-sm text-white w-full"
          value={globalSearch}
          onChange={e => setGlobalSearch && setGlobalSearch(e.target.value)}
        />
      </div>
      <button className="md:hidden p-2 text-gray-400"><Search size={20} /></button>
      <div 
        onClick={onSettingsClick}
        className="h-8 w-8 rounded-full bg-[#151632] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer flex-shrink-0 active:scale-95 transition-all"
      >
        <Settings size={14} />
      </div>
    </div>
  </header>
);
