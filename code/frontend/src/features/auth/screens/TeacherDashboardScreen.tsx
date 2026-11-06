import React, { useState } from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { useAppSelector } from "@redux/hooks";
import { Button } from "@components/ui/Button";
import { Badge } from "@components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { useNavigate } from "react-router-dom";
import {
    PlusCircle,
    HelpCircle,
    Users,
    Activity,
    FileCheck,
    CheckCircle,
    XCircle,
    ArrowRight,
    UserCheck,
} from "lucide-react";
import { useGetTeacherExamsQuery } from "@/redux/services/examBuilderApi";
import {
    useGetTeacherPendingRequestsQuery,
    useDecideRegistrationRequestMutation,
} from "@/redux/services/registrationApi";
import { formatDateTime, getTimeGreeting } from "@/utils/dateTime";

export const TeacherDashboardScreen: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();

    const { data: examsData } = useGetTeacherExamsQuery();
    const exams = (examsData as any)?.data || examsData || [];

    const { data: requestsData = [], refetch: refetchRequests } = useGetTeacherPendingRequestsQuery();
    const [decideRequest, { isLoading: isDeciding }] = useDecideRegistrationRequestMutation();
    const [actioningId, setActioningId] = useState<string | null>(null);

    const greeting = getTimeGreeting();
    const teacherName =
        user?.fullName ||
        (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) ||
        user?.email?.split('@')[0] ||
        "Instructor";

    const pendingRequests = requestsData.filter(
        (r) => r.status === "REQUESTED" || r.status === "PENDING"
    );

    const stats = [
        { label: "Exams Created", value: exams.length },
        { label: "Draft", value: exams.filter((e: any) => e.status === 'DRAFT').length },
        { label: "Published", value: exams.filter((e: any) => e.status === 'PUBLISHED').length },
        { label: "Closed", value: exams.filter((e: any) => e.status === 'CLOSED').length },
        {
            label: "Pending Requests",
            value: pendingRequests.length,
            highlight: pendingRequests.length > 0,
        },
    ];

    const handleQuickDecision = async (id: string, decision: "APPROVED" | "REJECTED") => {
        try {
            setActioningId(id);
            await decideRequest({ registrationId: id, decision }).unwrap();
            refetchRequests();
        } catch (err: any) {
            console.error("Quick decision error:", err);
            alert(err.data?.message || "Failed to update registration status.");
        } finally {
            setActioningId(null);
        }
    };

    const quickActions = [
        {
            label: "Create Exam",
            path: "/exams?create=true",
            icon: PlusCircle,
            variant: "primary" as const,
        },
        {
            label: "Registration Requests",
            path: "/registration-requests",
            icon: Users,
            variant: "secondary" as const,
        },
        {
            label: "Question Bank",
            path: "/question-bank",
            icon: HelpCircle,
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
                        {greeting}, {teacherName}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Manage your question bank, compose exam revisions, approve requests, and review grading queues.
                    </p>
                </div>

                {/* 5 Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className={`bg-white border rounded-md p-4 shadow-2xs text-left ${
                                stat.highlight
                                    ? "border-amber-300 bg-amber-50/40 ring-1 ring-amber-200"
                                    : "border-slate-200"
                            }`}
                        >
                            <div className={`text-2xl font-bold ${stat.highlight ? "text-amber-900" : "text-slate-900"}`}>
                                {stat.value}
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-1">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pending Registration Requests Section */}
                <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-[#4C70A6]" />
                            <h2 className="text-base font-bold text-slate-900">
                                Student Registration Requests (Approval Required)
                            </h2>
                            {pendingRequests.length > 0 && (
                                <Badge variant="warning">{pendingRequests.length} Pending</Badge>
                            )}
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-[#4C70A6] flex items-center gap-1"
                            onClick={() => navigate("/registration-requests")}
                        >
                            <span>View All Requests</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {pendingRequests.length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-md text-center text-xs text-slate-500">
                            No student registration requests currently awaiting approval.
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-md overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Exam</TableHead>
                                        <TableHead>Requested Time</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingRequests.slice(0, 5).map((req) => {
                                        const nowMs = Date.now();
                                        const regCloseMs = req.registrationClosesAt ? new Date(req.registrationClosesAt).getTime() : 0;
                                        const startsAtMs = req.startsAt ? new Date(req.startsAt).getTime() : 0;
                                        const isClosed = (req.isRegistrationOpen === false) || (regCloseMs > 0 && nowMs > regCloseMs) || (startsAtMs > 0 && nowMs > startsAtMs);

                                        return (
                                            <TableRow key={req.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 text-xs">
                                                            {req.studentName}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-mono">
                                                            {req.studentEmail}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-medium text-slate-800">
                                                        {req.examTitle}
                                                    </div>
                                                    {isClosed && (
                                                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                                            Window Closed
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono text-slate-500">
                                                    {formatDateTime(req.requestedAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs text-red-600 hover:bg-red-50 border border-red-200"
                                                            disabled={actioningId === req.id}
                                                            onClick={() => handleQuickDecision(req.id, "REJECTED")}
                                                            icon={<XCircle className="w-3.5 h-3.5 text-red-500" />}
                                                        >
                                                            {isClosed ? "Dismiss" : "Reject"}
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            className={`text-xs ${
                                                                isClosed
                                                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            }`}
                                                            disabled={actioningId === req.id || isClosed}
                                                            title={isClosed ? "Registration window has ended. Approvals cannot be granted." : "Approve Student Registration"}
                                                            onClick={() => !isClosed && handleQuickDecision(req.id, "APPROVED")}
                                                            icon={<CheckCircle className="w-3.5 h-3.5" />}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
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
