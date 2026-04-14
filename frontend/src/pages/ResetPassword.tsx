import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const token = searchParams.get("token");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const csrfRes = await fetch("/auth/csrf", {
                method: "GET",
                credentials: "include"
            });

            if (!csrfRes.ok) {
                throw new Error("Could not fetch CSRF token");
            }

            const { csrfToken } = await csrfRes.json();

            const res = await fetch("/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken
                },
                credentials: "include",
                body: JSON.stringify({
                    token,
                    newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            setMessage(data.message);

            setTimeout(() => {
                navigate("/");
            }, 1500);
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
                <h1 className="text-2xl font-bold text-center">Reset Password</h1>

                <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none"
                    required
                />

                <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none"
                    required
                />

                <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] font-bold text-[#11152D]"
                >
                    Reset password
                </button>

                {message && <p className="text-green-400 text-sm text-center">{message}</p>}
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            </form>
        </div>
    );
};

export default ResetPassword;