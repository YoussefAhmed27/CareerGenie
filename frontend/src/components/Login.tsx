import React, { useState, useEffect, useRef } from "react";
import { FaGoogle, FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

declare global {
    interface Window {
        google: any;
    }
}

const Login: React.FC = () => {
    // 1. The Base URL is defined here
    const NODE_BASE_URL = import.meta.env.VITE_NODE_URL || 'http://localhost:5000';

    const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
    const role: string = "candidate";
    const [error, setError] = useState<string>("");
    const navigate = useNavigate();
    const googleInitialized = useRef(false);

    const handleGoogleResponse = async (response: any) => {
        try {
            // 2. Fetch updated with Base URL
            const csrfResponse = await fetch(`${NODE_BASE_URL}/auth/csrf`, {
                method: "GET",
                credentials: "include"
            });

            if (!csrfResponse.ok) {
                throw new Error("Could not fetch CSRF token.");
            }

            const csrfData = await csrfResponse.json();
            const csrfToken = csrfData.csrfToken;

            // 3. Fetch updated with Base URL
            const res = await fetch(`${NODE_BASE_URL}/auth/google`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken
                },
                credentials: "include",
                body: JSON.stringify({ credential: response.credential })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || data.error || "Google login failed.");
            }

            localStorage.setItem("token", data.accessToken);
            localStorage.setItem("user_name", data.candidate.full_name);

            navigate("/");
        } catch (err: any) {
            console.error("Google Login Error:", err);
            setError(err.message || "Google login failed.");
        }
    };

    useEffect(() => {
        if (!window.google || !import.meta.env.VITE_GOOGLE_CLIENT_ID) return;
        if (googleInitialized.current) return;

        googleInitialized.current = true;

        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse
        });

        const googleDiv = document.getElementById("googleSignInDiv");

        if (googleDiv) {
            googleDiv.innerHTML = "";

            window.google.accounts.id.renderButton(googleDiv, {
                type: "icon",
                shape: "circle",
                size: "large"
            });
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        const target = e.currentTarget;
        const formData = new FormData(target);

        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;
        const name = formData.get("name") as string;

        // 1. Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
        if (!emailRegex.test(email)) {
            setError("The email address is invalid.");
            return;
        }

        const emailLower = email.toLowerCase().trim();
        const emailParts = emailLower.split("@");
        const localPart = emailParts[0] || "";

        const isHrEmail =
            localPart === "hr" ||
            localPart.startsWith("hr.") ||
            localPart.startsWith("hr_") ||
            localPart.startsWith("hr-");

        // 2. Sign-Up Specific Validations
        if (!isLoginMode) {
            const phoneRegex = /^01\d{9}$/;
            if (!phoneRegex.test(phone)) {
                setError("The phone number is invalid.");
                return;
            }

            if (password !== confirmPassword) {
                setError("The passwords don't match.");
                return;
            }

            if (role === "hr" && !isHrEmail) {
                setError("HR accounts must use an HR email address.");
                return;
            }

            if (role === "candidate" && isHrEmail) {
                setError("Candidate accounts cannot use an HR email address.");
                return;
            }
        }

        try {
            // 4. Fetch updated with Base URL
            const csrfResponse = await fetch(`${NODE_BASE_URL}/auth/csrf`, {
                method: "GET",
                credentials: "include"
            });

            if (!csrfResponse.ok) throw new Error("Cannot connect to security server.");

            const csrfData = await csrfResponse.json();
            const csrfToken = csrfData.csrfToken;

            const endpoint = isLoginMode ? "/auth/login" : "/auth/register";
            const payload = isLoginMode
                ? { email, password }
                : { full_name: name, email, password, phone, current_role: role };

            // 5. Fetch updated with Base URL
            const authResponse = await fetch(`${NODE_BASE_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken
                },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            const authData = await authResponse.json();

            if (!authResponse.ok) {
                throw new Error(authData.message || authData.error || "Authentication failed.");
            }

            if (!isLoginMode) {
                // 6. Fetch updated with Base URL
                const loginRes = await fetch(`${NODE_BASE_URL}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrfToken
                    },
                    credentials: "include",
                    body: JSON.stringify({ email, password })
                });

                const loginData = await loginRes.json();
                if (!loginRes.ok) throw new Error("Auto-login failed. Please log in manually.");

                localStorage.setItem("token", loginData.accessToken);
                localStorage.setItem("user_name", loginData.candidate.full_name);
            } else {
                localStorage.setItem("token", authData.accessToken);
                localStorage.setItem("user_name", authData.candidate.full_name);
            }

            const isHrAccount = role === "hr" || isHrEmail;
            if (isHrAccount) {
                navigate("/hr-dashboard");
            } else {
                navigate("/");
            }

        } catch (err: any) {
            console.error("Backend Error:", err);
            setError(err.message || "Failed to connect to the backend.");
        }
    };

    return (
        <div className="w-full max-w-125 bg-[#11152dde] p-6 sm:p-8 rounded-2xl shadow-2xl text-white flex flex-col h-175 max-h-[95vh] font-sans mx-auto">
            <div className="w-full flex flex-col h-full overflow-hidden">

                <div className="mb-6 text-center shrink-0">
                    <img src="/logo.png" alt="logo" className="w-48 sm:w-60 mx-auto mb-2" />
                </div>

                <div className="relative flex mb-6 rounded-full bg-white/10 p-1 shrink-0">
                    <div
                        className={`absolute top-1 left-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] transition-all duration-300 ${isLoginMode ? "translate-x-0" : "translate-x-full"}`}
                    />
                    <button
                        type="button"
                        className={`flex-1 py-2 z-10 transition-colors ${isLoginMode ? "text-black font-semibold" : "text-white"}`}
                        onClick={() => {
                            setIsLoginMode(true);
                            setError("");
                        }}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-2 z-10 transition-colors ${!isLoginMode ? "text-black font-semibold" : "text-white"}`}
                        onClick={() => {
                            setIsLoginMode(false);
                            setError("");
                        }}
                    >
                        Sign Up
                    </button>
                </div>

                {error && (
                    <div className="w-[90%] mx-auto bg-red-500/10 border border-red-500/50 text-red-400 text-sm py-2 px-4 rounded-xl mb-4 text-center animate-pulse shrink-0 break-words">
                        {error}
                    </div>
                )}

                <form
                    className="flex flex-col gap-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 px-1 pt-2"
                    onSubmit={handleSubmit}
                >
                    {!isLoginMode && (
                        <>
                            <input
                                name="name"
                                type="text"
                                placeholder="Name"
                                className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all shrink-0"
                                required
                            />
                            <input
                                name="phone"
                                type="tel"
                                placeholder="Phone number"
                                className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all shrink-0"
                                required
                            />
                        </>
                    )}

                    <input
                        name="email"
                        type="email"
                        placeholder="Email Address"
                        className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all shrink-0"
                        required
                    />

                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all shrink-0"
                        required
                    />

                    {!isLoginMode && (
                        <>
                            <input
                                name="confirmPassword"
                                type="password"
                                placeholder="Confirm password"
                                className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all shrink-0"
                                required
                            />

                        </>
                    )}

                    {isLoginMode && (
                        <div
                            className="text-right text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer shrink-0 transition-colors -mt-2"
                            onClick={() => navigate("/forgot-password")}
                        >
                            Forget password?
                        </div>
                    )}

                    <button
                        type="submit"
                        className="mt-auto w-full py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] hover:brightness-110 active:scale-[0.98] transition-all font-bold text-[#11152D] shrink-0 shadow-lg"
                    >
                        {isLoginMode ? "Login" : "Create Account"}
                    </button>
                </form>

                <div className="mt-6 pt-4 shrink-0 border-t border-white/5">
                    <p className="text-center text-sm text-white/50">
                        {isLoginMode ? "Not joined yet? " : "Already with us? "}
                        <span
                            className="text-indigo-400 font-semibold hover:underline cursor-pointer"
                            onClick={() => {
                                setIsLoginMode(!isLoginMode);
                                setError("");
                            }}
                        >
                            {isLoginMode ? "Sign up" : "Login"}
                        </span>
                    </p>

                    <div className="flex justify-center gap-4 sm:gap-6 mt-4">
                        <div className="relative w-11 h-11 rounded-full flex items-center justify-center group cursor-pointer overflow-hidden">
                            <div className="absolute inset-0 w-full h-full rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 border border-white/10 group-hover:border-white/30 transition-all pointer-events-none">
                                <FaGoogle className="text-white text-lg" />
                            </div>
                            
                            <div className="absolute inset-0 z-10 opacity-[0.01] flex items-center justify-center">
                                <div id="googleSignInDiv"></div>
                            </div>
                        </div>

                        <button className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-all">
                            <FaFacebookF className="text-white text-lg" />
                        </button>
                        <button className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-all">
                            <FaLinkedinIn className="text-white text-lg" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Login;
