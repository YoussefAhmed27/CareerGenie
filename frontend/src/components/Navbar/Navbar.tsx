import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NavbarMenu } from "../mockData/data";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { FiUser, FiLogOut, FiChevronDown } from "react-icons/fi"; 

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false); 
  const [profileOpen, setProfileOpen] = useState(false); 
 
  const [activeItem, setActiveItem] = useState("Home"); 

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('user_name') || "Candidate";

  const handleAuthAction = () => {
    if (token) {
      navigate('/interview/setup');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    try {
      const csrfRes = await fetch('/auth/csrf', { credentials: 'include' });
      if (csrfRes.ok) {
        const { csrfToken } = await csrfRes.json();
        await fetch('/auth/logout', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrfToken },
          credentials: 'include'
        });
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user_name');
      window.location.href = "/"; 
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, link: string, title: string) => {
    e.preventDefault();
    setIsOpen(false); 
    setActiveItem(title); // Update the active link visually

    if (link.startsWith('#')) {
      const targetId = link.substring(1);
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(link);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50">
      <div className="relative z-50 border-b border-white/10 rounded-b-3xl bg-[#11152D]/90 backdrop-blur-md shadow-lg">
        <div className="container mx-auto flex items-center justify-between h-20 px-6">
          
          <div className="flex-1 flex justify-start items-center cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="careerGenie logo" className="w-40 sm:w-48" />
          </div>

          <div className="hidden lg:flex shrink-0 justify-center">
            <ul className="flex items-center gap-12 text-[18px] text-gray-300">
              {NavbarMenu.map((item) => (
                <li key={item.id}>
                  <a 
                    href={item.link} 
                    onClick={(e) => handleNavClick(e, item.link, item.title)}
                    
                    className={`inline-block transition-colors cursor-pointer ${
                      activeItem === item.title 
                        ? 'text-white font-bold' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            
            {token ? (
              <div className="hidden sm:relative sm:block">
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
                >
                  <FiUser className="text-[#2EE8F1]" />
                  <span className="font-semibold">{userName}</span>
                  <FiChevronDown className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#0B0F19] border border-white/10 rounded-xl shadow-2xl py-2 flex flex-col z-50">
                    <button 
                      onClick={handleLogout}
                      className="px-4 py-2 text-left text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors flex items-center gap-2 rounded-xl"
                    >
                      <FiLogOut /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="hidden sm:block px-6 py-2 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] hover:brightness-110 active:scale-[0.98] transition-all font-semibold text-white shadow-lg text-sm sm:text-base"
                onClick={handleAuthAction}
              >
                Get Started
              </button>
            )}

            <button 
              className="lg:hidden text-white p-2 focus:outline-none" 
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <HiOutlineX size={28} /> : <HiOutlineMenu size={28} />}
            </button>
          </div>

        </div>
      </div>

      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden z-40 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsOpen(false)}
      ></div>

      <div 
        className={`fixed top-0 right-0 h-screen w-64 bg-[#11152D] border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden z-40 pt-24 px-6 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ul className="flex flex-col gap-6 text-lg text-gray-300">
          {NavbarMenu.map((item) => (
            <li key={item.id}>
              <a 
                href={item.link} 
                onClick={(e) => handleNavClick(e, item.link, item.title)}
                className={`block transition-colors cursor-pointer ${
                  activeItem === item.title 
                    ? 'text-white font-bold' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-white/10 pt-8 flex flex-col gap-4">
          {token ? (
            <>
              <p className="text-[#2EE8F1] font-semibold text-center pb-2">Hi, {userName}</p>
              <button
                onClick={handleLogout}
                className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 w-full font-semibold flex justify-center items-center gap-2"
              >
                <FiLogOut /> Sign Out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] hover:brightness-110 active:scale-[0.98] transition-all font-semibold text-white shadow-lg w-full"
              onClick={() => {
                navigate("/login");
                setIsOpen(false);
              }}
            >
              Get Started
            </button>
          )}
        </div>
      </div>

    </nav>
  );
};

export default Navbar;