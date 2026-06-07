import Navbar from "./Navbar/Navbar";
import { useNavigate } from "react-router-dom"; 
import { ArrowRight } from "lucide-react";

// Features Icons
import { VscFeedback } from "react-icons/vsc";
import { GrDocumentUser } from "react-icons/gr";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import { RiRobot3Line } from "react-icons/ri";
// Why Us Icons
import { BsChatSquareText } from "react-icons/bs";
import { BiBrain } from "react-icons/bi";
import { IoBarChartOutline } from "react-icons/io5";
import { HiOutlineDocumentSearch } from "react-icons/hi";

const Home = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token'); 

  const handleProtectedAction = () => {
    if (token) {
      navigate('/interview/setup'); 
    } else {
      navigate('/login'); 
    }
  };

  const handleCvAssistantAction = () => {
    if (token) {
      navigate('/cv-assistant');
    } else {
      navigate('/login');
    }
  };

 
  const handleHistoryAction = () => {
    if (token) {
      navigate('/history');
    } else {
      navigate('/login'); 
    }
  };

  return (
    <div className="bg-[#11152D] text-white font-sans w-full scroll-smooth">
      <Navbar />

      <main>
        <section id="home" className="min-h-screen flex items-center pt-10 pb-5 container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            <div className="flex flex-col justify-center max-w-xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15]">
                Your Genie Partner is here to make your{" "}
                <span className="text-[#2EE8F1] block mt-2">Dream Job a Reality</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-300 leading-relaxed max-w-lg">
                Experience realistic interview simulations, personalized coaching and comprehensive feedback to land your dream job.
              </p>

              <div className="mt-10">
                <button 
                  type="button" 
                  onClick={handleProtectedAction}
                  className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] hover:brightness-110 active:scale-[0.98] transition-all font-bold text-white text-lg shadow-[0_0_20px_rgba(46,232,241,0.3)]"
                >
                  Start Your Free Simulation
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end mt-10 lg:mt-1 group w-full">
              <img src="/female-avatar.png" alt="AI Interview Simulation" className="w-full max-w-150 lg:max-w-175 xl:scale-105 h-auto object-contain relative z-10 transition-transform duration-700 ease-out " />
            </div>

          </div>
        </section>

        <section id="features" className="min-h-screen flex flex-col justify-center py-20 container mx-auto px-6 border-t border-white/5">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] inline-block pb-0">
              Our Features
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
            <div className="rounded-3xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] p-0.5 transition-transform duration-300 hover:scale-[1.04]">
              <div className="bg-[#11152D] rounded-[22px] h-full flex flex-col items-center p-10 text-center">
                <GrDocumentUser className="w-20 h-20 text-white mb-6" />
                <h3 className="text-2xl font-bold text-white mb-8">CV Assistant</h3>
                <button onClick={handleCvAssistantAction} className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#1A1F3D] border border-white/10 hover:border-[#2EE8F1]/50 transition-colors">
                  <span className="font-semibold">Explore</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] p-0.5 transition-transform duration-300 hover:scale-[1.04]">
              <div className="bg-[#11152D] rounded-[22px] h-full flex flex-col items-center p-10 text-center">
                <LiaChalkboardTeacherSolid className="w-20 h-20 text-white mb-6" />
                <h3 className="text-2xl font-bold text-white mb-8">Interview Simulation</h3>
                <button onClick={handleProtectedAction} className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#1A1F3D] border border-white/10 hover:border-[#2EE8F1]/50 transition-colors">
                  <span className="font-semibold">Explore</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] p-0.5 transition-transform duration-300 hover:scale-[1.04]">
              <div className="bg-[#11152D] rounded-[22px] h-full flex flex-col items-center p-10 text-center">
                <RiRobot3Line className="w-20 h-20 text-white mb-6" />
                <h3 className="text-2xl font-bold text-white mb-8">Career Coach</h3>
                <button onClick={handleProtectedAction} className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#1A1F3D] border border-white/10 hover:border-[#2EE8F1]/50 transition-colors">
                  <span className="font-semibold">Explore</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] p-0.5 transition-transform duration-300 hover:scale-[1.04]">
              <div className="bg-[#11152D] rounded-[22px] h-full flex flex-col items-center p-10 text-center">
                <VscFeedback className="w-20 h-20 text-white mb-6" />
                <h3 className="text-2xl font-bold text-white mb-8">Feedback History</h3>
                <button onClick={handleHistoryAction} className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#1A1F3D] border border-white/10 hover:border-[#2EE8F1]/50 transition-colors">
                  <span className="font-semibold">Explore</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="min-h-screen flex flex-col justify-center py-20 container mx-auto px-6 border-t border-white/5">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] inline-block pb-2">
              How It Works
            </h2>
          </div>

          <div className="relative max-w-4xl mx-auto w-full">
            <div className="absolute left-7 md:left-1/2 top-0 bottom-0 w-0.5 bg-linear-to-b from-[#5975E2] to-[#E240CA] md:-translate-x-1/2 rounded-full"></div>

            {/* Step 1 */}
            <div className="relative flex items-center justify-between md:justify-normal w-full mb-10">
              <div className="absolute left-0 md:left-1/2 w-14 h-14 rounded-full bg-[#0B0F19] border-2 border-[#5975E2] flex items-center justify-center md:-translate-x-1/2 z-10 shadow-[0_0_15px_rgba(89,117,226,0.5)]">
                <svg className="w-6 h-6 text-[#2EE8F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
              <div className="w-full pl-20 md:pl-0 md:w-[45%] md:pr-12">
                <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] to-[#E240CA] p-px">
                  <div className="bg-[#11152D] rounded-[15px] p-5">
                    <h4 className="text-xl font-bold text-white mb-2">Step 1: Sign Up</h4>
                    <p className="text-gray-400">Create your account to get started with the interview process.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-center justify-between md:justify-normal w-full mb-10 md:flex-row-reverse">
              <div className="absolute left-0 md:left-1/2 w-14 h-14 rounded-full bg-[#0B0F19] border-2 border-[#E240CA] flex items-center justify-center md:-translate-x-1/2 z-10 shadow-[0_0_15px_rgba(226,64,202,0.5)]">
                <svg className="w-6 h-6 text-[#E240CA]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              </div>
              <div className="w-full pl-20 md:pl-0 md:w-[45%]">
                <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] to-[#E240CA] p-px">
                  <div className="bg-[#11152D] rounded-[15px] p-5">
                    <h4 className="text-xl font-bold text-white mb-2">Step 2: Create Meeting</h4>
                    <p className="text-gray-400">Schedule your interview session at a time that works best for you.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-center justify-between md:justify-normal w-full mb-10">
              <div className="absolute left-0 md:left-1/2 w-14 h-14 rounded-full bg-[#0B0F19] border-2 border-[#5975E2] flex items-center justify-center md:-translate-x-1/2 z-10 shadow-[0_0_15px_rgba(89,117,226,0.5)]">
                <svg className="w-6 h-6 text-[#2EE8F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </div>
              <div className="w-full pl-20 md:pl-0 md:w-[45%] md:pr-12">
                <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] to-[#E240CA] p-px">
                  <div className="bg-[#11152D] rounded-[15px] p-5">
                    <h4 className="text-xl font-bold text-white mb-2">Step 3: Attend Meeting</h4>
                    <p className="text-gray-400">Join and get ready for the simulated interview with your recruiter.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative flex items-center justify-between md:justify-normal w-full mb-10 md:flex-row-reverse">
              <div className="absolute left-0 md:left-1/2 w-14 h-14 rounded-full bg-[#0B0F19] border-2 border-[#E240CA] flex items-center justify-center md:-translate-x-1/2 z-10 shadow-[0_0_15px_rgba(226,64,202,0.5)]">
                <svg className="w-6 h-6 text-[#E240CA]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              </div>
              <div className="w-full pl-20 md:w-[45%] md:pl-12">
                <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] to-[#E240CA] p-px">
                  <div className="bg-[#11152D] rounded-[15px] p-5">
                    <h4 className="text-xl font-bold text-white mb-2">Step 4: Review Results</h4>
                    <p className="text-gray-400">Get insights into your interview performance.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative flex items-center justify-between md:justify-normal w-full">
              <div className="absolute left-0 md:left-1/2 w-14 h-14 rounded-full bg-[#0B0F19] border-2 border-[#5975E2] flex items-center justify-center md:-translate-x-1/2 z-10 shadow-[0_0_15px_rgba(89,117,226,0.5)]">
                <svg className="w-6 h-6 text-[#2EE8F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              </div>
              <div className="w-full pl-20 md:pl-0 md:w-[45%] md:pr-12">
                <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] to-[#E240CA] p-px">
                  <div className="bg-[#11152D] rounded-[15px] p-5">
                    <h4 className="text-xl font-bold text-white mb-2">Step 5: Receive Feedback</h4>
                    <p className="text-gray-400">Receive crucial feedback to improve for future opportunities.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <section id="why-us" className="min-h-screen flex flex-col justify-center py-20 container mx-auto px-6 border-t border-white/5">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] inline-block pb-4">
              Why Choose CareerGenie
            </h2>
            <p className="text-lg text-gray-400 mb-2">Empowering candidates with smart preparation and real feedback</p>
            <p className="text-base text-gray-500">We combine AI-driven insights with realistic simulations to help you unlock your potential before the real interview</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full mb-12">
            <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] p-px">
              <div className="bg-[#0B0F19] rounded-[15px] h-full flex flex-col sm:flex-row items-start p-6 gap-5">
                <div className="min-w-14 h-14 rounded-xl bg-[#0B0F19] border border-[#5975E2]/30 flex items-center justify-center text-[#2EE8F1] shadow-[0_0_15px_rgba(89,117,226,0.15)]">
                  <BsChatSquareText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">AI-Powered Interview Coach</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">Personalizes real-time feedback on answers, tone and confidence</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] p-px">
              <div className="bg-[#0B0F19] rounded-[15px] h-full flex flex-col sm:flex-row items-start p-6 gap-5">
                <div className="min-w-14 h-14 rounded-xl bg-[#0B0F19] border border-[#5975E2]/30 flex items-center justify-center text-[#2EE8F1] shadow-[0_0_15px_rgba(89,117,226,0.15)]">
                  <BiBrain size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Real Simulation Experience</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">Practice with avatars that mimic real recruiters and real pressure</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] p-px">
              <div className="bg-[#0B0F19] rounded-[15px] h-full flex flex-col sm:flex-row items-start p-6 gap-5">
                <div className="min-w-14 h-14 rounded-xl bg-[#0B0F19] border border-[#5975E2]/30 flex items-center justify-center text-[#2EE8F1] shadow-[0_0_15px_rgba(89,117,226,0.15)]">
                  <IoBarChartOutline size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Performance Analytics</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">Get detailed reports highlighting your strength and areas of growth</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] p-px">
              <div className="bg-[#0B0F19] rounded-[15px] h-full flex flex-col sm:flex-row items-start p-6 gap-5">
                <div className="min-w-14 h-14 rounded-xl bg-[#0B0F19] border border-[#5975E2]/30 flex items-center justify-center text-[#2EE8F1] shadow-[0_0_15px_rgba(89,117,226,0.15)]">
                  <HiOutlineDocumentSearch size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Tailored CV & Role Matching</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">Let the system analyze your CV and prepare relevant interview questions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center flex flex-col items-center">
            <h3 className="text-2xl font-bold text-white mb-6">Ready to experience your dream interview?</h3>
            <button 
              type="button" 
              onClick={handleProtectedAction}
              className="group px-10 py-4 rounded-2xl bg-linear-to-r from-[#2EE8F1] via-[#5975E2] to-[#E240CA] hover:brightness-110 active:scale-[0.98] transition-all font-bold text-white text-lg shadow-[0_0_20px_rgba(46,232,241,0.3)] w-full max-w-sm"
            >
              Start Your Free Simulation
            </button>
          </div>
        </section>


        {/* HR Portal CTA */}
        <section className="py-20 border-t border-white/5 bg-[#0B0C1E]/30 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[#22d3ee]/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Are you a Recruiter or HR Professional?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-10">
              Transform your hiring process with our autonomous AI interviewers.
              Automate screening and find top talent faster.
            </p>
            <button 
              onClick={() => navigate('/hr')}
              className="px-8 py-3 rounded-full border border-[#22d3ee] text-[#22d3ee] font-bold hover:bg-[#22d3ee]/10 transition-all flex items-center gap-2 mx-auto group"
            >
              Go to HR Portal
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;
