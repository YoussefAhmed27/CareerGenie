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
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [cvFile, setCvFile] = useState<File | null>(null);
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
    }, [profile.photo_filename, profile.cv_filename, photoPreviewUrl, cvPreviewUrl]);

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

    const handlePhotoUpload = async () => {
        if (!photoFile) {
            setError("Please choose a photo first.");
            return;
        }

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
            formData.append("photo", photoFile);

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
                photo_filename: photoFile.name
            }));

            const localPhotoUrl = URL.createObjectURL(photoFile);
            setPhotoPreviewUrl(localPhotoUrl);

            setPhotoFile(null);
            setMessage("Photo uploaded successfully.");
        } catch (err: any) {
            setError(err.message || "Failed to upload photo");
        }
    };

    const handleCvUpload = async () => {
        if (!cvFile) {
            setError("Please choose a PDF CV first.");
            return;
        }

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
            formData.append("cv", cvFile);

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
                cv_filename: cvFile.name
            }));

            const localCvUrl = URL.createObjectURL(cvFile);
            setCvPreviewUrl(localCvUrl);

            setCvFile(null);
            setMessage("CV uploaded successfully.");
        } catch (err: any) {
            setError(err.message || "Failed to upload CV");
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
            <div className="max-w-5xl mx-auto bg-[#11152dde] rounded-2xl shadow-2xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">My Profile</h1>

                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition"
                    >
                        ← Back
                    </button>
                </div>

                {message && (
                    <div className="mb-4 rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-3 text-green-400">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-400">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6 relative z-50">
                        <div className="rounded-2xl bg-white/5 p-5 border border-white/10">
                            <h2 className="text-xl font-semibold mb-4">Profile Photo</h2>

                            <div className="w-36 h-36 rounded-full overflow-hidden bg-white/10 mx-auto mb-4 border border-white/20">
                                    {photoPreviewUrl ? (
                                        <img
                                            src={photoPreviewUrl}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                                        No photo
                                    </div>
                                )}
                            </div>

                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="w-full py-3 mb-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition"
                            >
                                {photoFile ? photoFile.name : "Choose Profile Photo"}
                            </button>

                            <button
                                type="button"
                                onClick={handlePhotoUpload}
                                className="w-full py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] text-[#11152D] font-bold relative z-50"
                            >
                                Upload Photo
                            </button>
                        </div>

                        <div className="rounded-2xl bg-white/5 p-5 border border-white/10 relative z-50">
                            <h2 className="text-xl font-semibold mb-4">CV / Resume</h2>

                            <input
                                ref={cvInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => cvInputRef.current?.click()}
                                className="w-full py-3 mb-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition"
                            >
                                {cvFile ? cvFile.name : "Choose PDF CV"}
                            </button>

                            <button
                                type="button"
                                onClick={handleCvUpload}
                                className="w-full py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] text-[#11152D] font-bold mb-3 relative z-50"
                            >
                                Upload PDF CV
                            </button>

                            {cvPreviewUrl && (
                                <a
                                    href={cvPreviewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#2EE8F1] underline text-sm"
                                >
                                    View current CV
                                </a>
                            )}
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

                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-xl bg-linear-to-r from-[#E240CA] via-[#5975E2] to-[#2EE8F1] text-[#11152D] font-bold"
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