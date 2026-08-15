import React from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { useAppSelector } from "@redux/hooks";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Calendar, Clock, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const StudentDashboardScreen: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();

    const studentName = user?.fullName || "Student";

    const stats = [
        { label: "Registered Exams", value: 4 },
        { label: "Upcoming", value: 2 },
        { label: "Completed", value: 1 },
        { label: "Results Published", value: 1 },
    ];

    const upcomingExams = [
        {
            id: "ex-401",
            title: "Computer Science 401 — Distributed Systems",
            date: "Jul 25, 2026 • 10:00 AM",
            status: "Pending",
            badgeVariant: "warning" as const,
        },
        {
            id: "ex-202",
            title: "Mathematics 202 — Advanced Calculus",
            date: "Aug 1, 2026 • 2:00 PM",
            status: "Registered",
            badgeVariant: "info" as const,
        },
    ];

    return (
        <AppLayout pageTitle="Student Dashboard">
            <div className="flex flex-col gap-6">
                {/* Welcome Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Welcome back, {studentName}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Access your registered examinations, schedules, and published results.
                    </p>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs text-left"
                        >
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <div className="text-xs text-slate-500 font-medium mt-1">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Upcoming Exams Section */}
                <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#4C70A6]" />
                            <span>Upcoming Exams</span>
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/catalogue")}
                            className="text-xs text-[#4C70A6] hover:underline"
                        >
                            View Catalogue
                        </Button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {upcomingExams.map((exam) => (
                            <div
                                key={exam.id}
                                className="flex items-center justify-between p-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 rounded-md transition-colors"
                            >
                                <div className="flex flex-col gap-1 text-left">
                                    <span className="font-semibold text-sm text-slate-900">
                                        {exam.title}
                                    </span>
                                    <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        {exam.date}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Badge variant={exam.badgeVariant}>{exam.status}</Badge>
                                    {exam.status === "Registered" && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            icon={<Play className="w-3.5 h-3.5" />}
                                            onClick={() => navigate(`/exam/${exam.id}/launch`)}
                                        >
                                            Launch
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};
