import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@components/ui/Badge";
import { logout } from "@redux/slices/authSlice";
import { useAppSelector } from "@redux/hooks";
import { useLogoutMutation } from "@redux/services/authApi";

import {
    User,
    LogOut,
    Smartphone,
    ChevronDown,
    Shield,
    BookOpen,
    LayoutDashboard,
    HelpCircle,
    FileCheck,
    Activity,
    Users,
} from "lucide-react";

interface AppLayoutProps {
    children: React.ReactNode;
    pageTitle?: string | undefined;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const user = useAppSelector((state) => state.auth.user);;
    const navigate = useNavigate();
    const location = useLocation();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [logoutMutation] = useLogoutMutation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logoutMutation()
            .unwrap()
            .then(() => {
                logout(); // Clear user data from Redux store
                console.log("Logout successful");
                navigate("/login");
            })
            .catch((err) => {
                console.error("Logout failed:", err);
            });
    };

    // Get user initials for avatar
    const getInitials = (name?: string) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Industry Standard navigation items based on role
    const getNavItems = () => {
        if (!user) return [];
        switch (user.role) {
            case "STUDENT":
                return [
                    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
                    { label: "Exams", path: "/catalogue", icon: BookOpen },
                    { label: "Results", path: "/results", icon: FileCheck },
                ];
            case "TEACHER":
                return [
                    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
                    { label: "Exams", path: "/exams", icon: BookOpen },
                    { label: "Question Bank", path: "/question-bank", icon: HelpCircle },
                    { label: "Monitoring", path: "/monitoring", icon: Activity },
                    { label: "Grading", path: "/grading", icon: FileCheck },
                ];
            case "OWNER":
                return [
                    { label: "Owner Console", path: "/owner-console", icon: Shield },
                    { label: "Teachers", path: "/owner-console", icon: Users },
                ];
            case "PROCTOR":
                return [
                    { label: "Dashboard", path: "/proctor-dashboard", icon: LayoutDashboard },
                    { label: "Live Monitor", path: "/monitoring", icon: Activity },
                ];
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
            {/* Top Navbar — Industry Standard Layout */}
            <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between select-none shadow-2xs z-40 sticky top-0">
                <div className="flex items-center gap-8">
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-900 hover:opacity-90 transition-opacity"
                    >
                        <Shield className="w-5 h-5 text-[#4C70A6]" />
                        <span>Exam Platform</span>
                    </Link>

                    {/* Role Navigation Links */}
                    {user && navItems.length > 0 && (
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive
                                            ? "bg-slate-100 text-slate-900 font-semibold"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                            }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    )}
                </div>

                {/* Right Corner User Dropdown Menu */}
                {user ? (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-2.5 p-1 rounded-md hover:bg-slate-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4C70A6]/30 cursor-pointer"
                            aria-expanded={isUserMenuOpen}
                        >
                            {/* User Avatar */}
                            <div className="w-8 h-8 rounded-full bg-[#4C70A6] text-white flex items-center justify-center font-semibold text-xs shadow-2xs">
                                {getInitials(user.fullName)}
                            </div>
                            <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${isUserMenuOpen ? "rotate-180" : ""
                                    }`}
                            />
                        </button>

                        {/* Dropdown Menu Overlay */}
                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-lg py-1.5 text-slate-800 z-50 animate-fadeIn">
                                {/* User Info Header */}
                                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                                    <div className="font-semibold text-sm text-slate-900 truncate">
                                        {user.fullName}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate mt-0.5">
                                        {user.email}
                                    </div>
                                    <div className="mt-2">
                                        <Badge variant="info">{user.role}</Badge>
                                    </div>
                                </div>

                                {/* Navigation Items */}
                                <div className="py-1">
                                    <Link
                                        to="/profile"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                    >
                                        <User className="w-3.5 h-3.5 text-slate-500" />
                                        <span>My Profile</span>
                                    </Link>

                                    {user.role === "STUDENT" && (
                                        <Link
                                            to="/devices"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                        >
                                            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                                            <span>My Devices</span>
                                        </Link>
                                    )}
                                </div>

                                <div className="border-t border-slate-100 pt-1 mt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                                    >
                                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                                        <span>Sign out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-xs font-medium">
                        <Link
                            to="/login"
                            className="text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link
                            to="/signup"
                            className="bg-[#4C70A6] text-white px-3 py-1.5 rounded-md hover:bg-[#3F5E8E] transition-colors"
                        >
                            Create account
                        </Link>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto animate-fadeIn">
                {children}
            </main>
        </div>
    );
};