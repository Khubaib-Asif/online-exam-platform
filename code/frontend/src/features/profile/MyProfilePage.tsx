import { useNavigate } from "react-router";
import { User, PencilLine } from "lucide-react";

export default function MyProfilePage() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate("/login");
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-16 font-display">
            <div className="w-160 rounded-2xl border border-[#d6dbe1] bg-white px-10 py-8 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.06)]">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-[22px] font-semibold text-gray-900">Profile</h2>
                    <button
                        onClick={handleLogout}
                        className="rounded-1.5 border-error bg-destructive text-error h-9 w-25 cursor-pointer border text-[13px] font-medium transition-colors hover:bg-red-100"
                    >
                        Log out
                    </button>
                </div>

                <div className="mb-5 h-px bg-[#d6dbe1]" />

                {/* Avatar + name */}
                <div className="mb-5 flex items-center gap-5">
                    <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <User size={28} className="text-blue-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[20px] font-bold text-gray-900">John Doe</p>
                        <p className="text-[14px] text-gray-400">
                            Student ID: STU-2025-001
                        </p>
                        <p className="text-[14px] text-gray-400">Member since July 2025</p>
                    </div>
                </div>

                <div className="mb-5 h-px bg-[#d6dbe1]" />

                {/* Info fields */}
                <div className="mb-5 flex gap-6">
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[12px] font-medium tracking-wide text-gray-400 uppercase">
                            Email
                        </p>
                        <p className="text-[15px] text-gray-900">
                            john.doe@institution.edu
                        </p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[12px] font-medium tracking-wide text-gray-400 uppercase">
                            Role
                        </p>
                        <p className="text-[15px] text-gray-900">Student</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[12px] font-medium tracking-wide text-gray-400 uppercase">
                            Institution
                        </p>
                        <p className="text-[15px] text-gray-900">Demo University</p>
                    </div>
                </div>

                {/* Coming soon banner */}
                <div className="flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-50">
                    <PencilLine size={14} className="text-gray-400" />
                    <p className="text-[13px] text-gray-400">
                        Profile editing coming soon
                    </p>
                </div>
            </div>
        </div>
    );
}
