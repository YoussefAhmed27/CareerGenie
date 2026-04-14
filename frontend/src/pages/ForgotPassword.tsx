import React, { useState } from "react";

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");

        try {
            const csrfRes = await fetch("/auth/csrf", {
                method: "GET",
                credentials: "include"
            });

            if (!csrfRes.ok) {
                throw new Error("Could not fetch CSRF token");
            }

            const { csrfToken } = await csrfRes.json();

            const res = await fetch("/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken
                },
                credentials: "include",
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send reset link");
            }

            setMessage(data.message);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b1020] text-white p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md bg-[#11152dde] p-6 rounded-2xl shadow-2xl flex flex-col gap-4"
            >
                <h1 className="text-2xl font-bold text-center">Forgot Password</h1>

                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none"
                    required
                />

                <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] font-bold text-[#11152D]"
                >
                    Send reset link
                </button>

                {message && <p className="text-green-400 text-sm text-center">{message}</p>}
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            </form>
        </div>
    );
};

export default ForgotPassword;