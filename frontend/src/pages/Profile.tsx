import React, { useEffect, useRef, useState } from "react";

type ProfileData = {
    full_name: string;
    email: string;
    phone: string;
    country: string;
    years_of_experience: string;
    current_role: string;
    desired_role: string;
    bio_summary: string;
    linkedin_url: string;
    portfolio_url: string;
    photo_filename: string;
    cv_filename: string;
};

const Profile: React.FC = () => {
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const cvInputRef = useRef<HTMLInputElement | null>(null);

    const [profile, setProfile] = useState<ProfileData>({
        full_name: "",
        email: "",
        phone: "",
        country: "",
        years_of_experience: "",
        current_role: "",
        desired_role: "",
        bio_summary: "",
        linkedin_url: "",
        portfolio_url: "",
        photo_filename: "",
        cv_filename: ""
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
    const [cvPreviewUrl, setCvPreviewUrl] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await fetch("/api/profile/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    credentials: "include"
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load profile");
                }

                setProfile({
                    full_name: data.full_name || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    country: data.country || "",
                    years_of_experience: data.years_of_experience?.toString() || "",
                    current_role: data.current_role || "",
                    desired_role: data.desired_role || "",
                    bio_summary: data.bio_summary || "",
                    linkedin_url: data.linkedin_url || "",
                    portfolio_url: data.portfolio_url || "",
                    photo_filename: data.photo_filename || "",
                    cv_filename: data.cv_filename || ""
                });
            } catch (err: any) {
                setError(err.message || "Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    useEffect(() => {
        const fetchProtectedFiles = async () => {
            try {
                const token = localStorage.getItem("token");

                if (!token) return;

                if (profile.photo_filename) {
                    const photoRes = await fetch("/api/profile/photo", {
                        headers: {
                            Authorization: `Bearer ${token}`
                        },
                        credentials: "include"
                    });

                    if (photoRes.ok) {
                        const photoBlob = await photoRes.blob();
                        const photoUrl = URL.createObjectURL(photoBlob);
                        setPhotoPreviewUrl(photoUrl);
                    }
                }

                if (profile.cv_filename) {
                    const cvRes = await fetch("/api/profile/cv", {
                        headers: {
                            Authorization: `Bearer ${token}`
                        },
                        credentials: "include"
                    });

                    if (cvRes.ok) {
                        const cvBlob = await cvRes.blob();
                        const cvUrl = URL.createObjectURL(cvBlob);
                        setCvPreviewUrl(cvUrl);
                    }
                }
            } catch (err) {
                console.error("Failed to load protected files", err);
            }
        };

        fetchProtectedFiles();

        return () => {
            if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
            if (cvPreviewUrl) URL.revokeObjectURL(cvPreviewUrl);
        };
    }, [profile.photo_filename, profile.cv_filename]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfile({
            ...profile,
            [e.target.name]: e.target.value
        });
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");

        try {
            const token = localStorage.getItem("token");

            const csrfRes = await fetch("/auth/csrf", {
                method: "GET",
                credentials: "include"
            });

            const { csrfToken } = await csrfRes.json();

            const res = await fetch("/api/profile/me", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken,
                    Authorization: `Bearer ${token}`
                },
                credentials: "include",
                body: JSON.stringify({
                    full_name: profile.full_name,
                    phone: profile.phone,
                    country: profile.country,
                    years_of_experience: profile.years_of_experience,
                    current_role: profile.current_role,
                    desired_role: profile.desired_role,
                    bio_summary: profile.bio_summary,
                    linkedin_url: profile.linkedin_url,
                    portfolio_url: profile.portfolio_url
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update profile");
            }

            localStorage.setItem("user_name", profile.full_name);
            setMessage("Profile updated successfully.");
        } catch (err: any) {
            setError(err.message || "Failed to update profile");
        }
    };

    const handlePhotoUpload = async (file: File) => {
        setMessage("");
        setError("");

        try {
            const token = localStorage.getItem("token");

            const csrfRes = await fetch("/auth/csrf", {
                method: "GET",
                credentials: "include"
            });

            const { csrfToken } = await csrfRes.json();

            const formData = new FormData();
            formData.append("photo", file);

            const res = await fetch("/api/profile/upload-photo", {
                method: "POST",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    Authorization: `Bearer ${token}`
                },
                credentials: "include",
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to upload photo");
            }

            setProfile((prev) => ({
                ...prev,
                photo_filename: file.name
            }));

            const localPhotoUrl = URL.createObjectURL(file);
            setPhotoPreviewUrl(localPhotoUrl);

            setMessage("Photo uploaded successfully.");
        } catch (err: any) {
            setError(err.message || "Failed to upload photo");
        }
    };

    const handleCvUpload = async (file: File) => {
        setMessage("");
        setError("");

        try {
            const token = localStorage.getItem("token");

            const csrfRes = await fetch("/auth/csrf", {
                method: "GET",
                credentials: "include"
            });

            const { csrfToken } = await csrfRes.json();

            const formData = new FormData();
            formData.append("cv", file);

            const res = await fetch("/api/profile/upload-cv", {
                method: "POST",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    Authorization: `Bearer ${token}`
                },
                credentials: "include",
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to upload CV");
            }

            setProfile((prev) => ({
                ...prev,
                cv_filename: file.name
            }));

            const localCvUrl = URL.createObjectURL(file);
            setCvPreviewUrl(localCvUrl);

            setMessage("CV uploaded successfully.");
        } catch (err: any) {
            setError(err.message || "Failed to upload CV");
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to completely delete your account? This action cannot be undone.")) return;
        
        try {
            const token = localStorage.getItem("token");
            const csrfRes = await fetch("/auth/csrf", {
                method: "GET",
                credentials: "include"
            });
            const { csrfToken } = await csrfRes.json();

            const res = await fetch("/api/profile/me", {
                method: "DELETE",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    Authorization: `Bearer ${token}`
                },
                credentials: "include"
            });

            if (res.ok) {
                localStorage.removeItem("token");
                localStorage.removeItem("user_name");
                window.location.href = "/login";
            } else {
                const data = await res.json();
                setError(data.error || "Failed to delete account");
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete account");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#11152D] text-white">
                Loading profile...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#11152D] text-white px-4 py-8">
            <div className="max-w-5xl mx-auto bg-[#11152dde] rounded-2xl shadow-2xl p-6 md:p-8 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">My Profile</h1>

                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors font-medium"
                    >
                        ← Back
                    </button>
                </div>

                {message && (
                    <div className="mb-4 rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-3 text-green-400 font-medium">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-400 font-medium">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6 relative z-50">
                        
                        {/* Profile Photo Section */}
                        <div className="rounded-2xl bg-white/5 p-5 border border-white/10">
                            <h2 className="text-xl font-semibold mb-4">Profile Photo</h2>

                            <div className="w-36 h-36 rounded-full overflow-hidden bg-white/10 mx-auto mb-4 border border-white/20 flex items-center justify-center shadow-inner">
                                {photoPreviewUrl ? (
                                    <img
                                        src={photoPreviewUrl}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                )}
                            </div>

                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handlePhotoUpload(file);
                                    }
                                }}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] hover:brightness-110 active:scale-[0.98] transition-all text-[#11152D] font-bold shadow-lg"
                            >
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload Photo
                            </button>
                        </div>

                        {/* CV / Resume Section */}
                        <div className="rounded-2xl bg-white/5 p-5 border border-white/10 relative z-50">
                            <h2 className="text-xl font-semibold mb-4">CV / Resume</h2>

                            <input
                                ref={cvInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleCvUpload(file);
                                    }
                                }}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => cvInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] hover:brightness-110 active:scale-[0.98] transition-all text-[#11152D] font-bold shadow-lg"
                            >
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload CV
                            </button>

                            {cvPreviewUrl && (
                                <a
                                    href={cvPreviewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-2.5 mt-3 rounded-xl bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    View Current CV
                                </a>
                            )}
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 active:scale-[0.98] transition-all font-semibold"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                                Delete Account
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="md:col-span-2">
                                <label className="block mb-2 text-sm text-white/70">Full Name</label>
                                <input
                                    name="full_name"
                                    value={profile.full_name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-white/70">Email</label>
                                <input
                                    name="email"
                                    value={profile.email}
                                    disabled
                                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-white/70">Phone</label>
                                <input
                                    name="phone"
                                    value={profile.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-white/70">Country</label>
                                <input
                                    name="country"
                                    value={profile.country}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-white/70">Years of Experience</label>
                                <input
                                    name="years_of_experience"
                                    type="number"
                                    value={profile.years_of_experience}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-white/70">Current Role</label>
                                <input
                                    name="current_role"
                                    value={profile.current_role}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm text-white/70">Desired Role</label>
                                <input
                                    name="desired_role"
                                    value={profile.desired_role}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block mb-2 text-sm text-white/70">LinkedIn URL</label>
                                <input
                                    name="linkedin_url"
                                    value={profile.linkedin_url}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block mb-2 text-sm text-white/70">Portfolio URL</label>
                                <input
                                    name="portfolio_url"
                                    value={profile.portfolio_url}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block mb-2 text-sm text-white/70">Bio Summary</label>
                                <textarea
                                    name="bio_summary"
                                    value={profile.bio_summary}
                                    onChange={handleChange}
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>

                            <div className="md:col-span-2 mt-2">
                                <button
                                    type="submit"
                                    className="w-full py-3.5 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] hover:brightness-110 active:scale-[0.98] transition-all text-[#11152D] font-bold shadow-lg"
                                >
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
