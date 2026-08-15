import React from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { useAppSelector } from "@redux/hooks";
import { Button } from "@components/ui/Button";
import { useNavigate } from "react-router-dom";
import {
    PlusCircle,
    HelpCircle,
    Users,
    Activity,
    FileCheck,
} from "lucide-react";

export const TeacherDashboardScreen: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();

    const teacherName = user?.fullName || "Sarah";

    const stats = [
        { label: "Exams Created", value: 12 },
        { label: "Draft", value: 3 },
        { label: "Published", value: 7 },
        { label: "Closed", value: 2 },
    ];

    const quickActions = [
        {
            label: "Create Exam",
            path: "/builder/new",
            icon: PlusCircle,
            variant: "primary" as const,
        },
        {
            label: "Question Bank",
            path: "/question-bank",
            icon: HelpCircle,
            variant: "secondary" as const,
        },
        {
            label: "Registration Requests",
            path: "/registration-requests",
            icon: Users,
            variant: "secondary" as const,
        },
        {
            label: "Live Monitor",
            path: "/monitoring",
            icon: Activity,
            variant: "secondary" as const,
        },
        {
            label: "Grading Queue",
            path: "/grading",
            icon: FileCheck,
            variant: "secondary" as const,
        },
    ];

    return (
        <AppLayout pageTitle="Teacher Dashboard">
            <div className="flex flex-col gap-6">
                {/* Header Greeting */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Good morning, {teacherName}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Manage your question bank, compose exam revisions, approve requests, and review grading queues.
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

                {/* Quick Actions Card */}
                <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs">
                    <h2 className="text-base font-bold text-slate-900 mb-4 text-left">
                        Quick Actions
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {quickActions.map((action, idx) => {
                            const Icon = action.icon;
                            return (
                                <Button
                                    key={idx}
                                    variant={action.variant}
                                    size="md"
                                    className="w-full flex-col py-4 h-auto gap-2 border-slate-300 shadow-2xs"
                                    onClick={() => navigate(action.path)}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs font-semibold">{action.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};
