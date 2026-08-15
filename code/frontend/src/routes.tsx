import React, { useEffect } from "react";
import {
    createBrowserRouter,
    Navigate,
    RouterProvider,
    useSearchParams,
    useNavigate,
    useLocation
} from "react-router-dom";
import { useAppSelector } from "@redux/hooks";
import { type SystemRole } from "@redux/slices/authSlice";
import { useGetDevicesQuery } from "@redux/services/deviceApi";
import { useValidateResetTokenQuery } from "@redux/services/authApi";

// M1 Auth & Identity Screens
import {
    BootstrapScreen,
    LandingScreen,
    LoginScreen,
    StudentSignupScreen,
    TeacherActivationScreen,
    OwnerConsoleScreen,
    ForgotPasswordScreen,
    ResetPasswordScreen,
    VerifyEmailNagScreen,
    RegisterDeviceScreen,
    DeviceLimitReachedScreen,
    MyDevicesScreen,
    MyProfileScreen,
    StudentDashboardScreen,
    TeacherDashboardScreen,
    ProctorDashboardScreen,
} from "@features/auth";

// M2 Exam Registration & Access Screens
import {
    ExamCatalogueScreen,
    ExamDetailsScreen,
    InvitationRedemptionScreen,
    RegistrationRequestScreen,
    RegistrationStatusScreen,
    TeacherRegistrationRequestsScreen,
    TeacherRegistrationReviewScreen,
    ExamDistributionStatusScreen,
} from "@features/access";

// M3 Question Bank Screens
import {
    QuestionBankListScreen,
    QuestionEditorScreen,
    QuestionPreviewScreen,
    QuestionImportScreen,
    QuestionOrganisationScreen,
    QuestionVersionHistoryScreen,
} from "@features/questions";

// M4 Exam Builder & Publication Screens
import {
    ExamListScreen,
    ExamBuilderScreen,
    ExamSettingsAudienceScreen,
    ExamPreviewScreen,
    PublishExamScreen,
    M4DistributionStatusScreen,
} from "@features/builder";

// M5 Device & Security Gates Screens
import {
    DownloadDesktopAppScreen,
    SessionEntryScreen,
    DeviceSecurityGatesScreen,
    GateFailureScreen,
    DeviceRegistrationScreen,
    RevokeDeviceConfirmationScreen,
} from "@features/devices";

// M6 Exam Session Orchestration Screens
import {
    LiveExamSessionScreen,
    ReconnectScreen,
    AttemptTerminatedScreen,
    SubmissionConfirmationScreen,
    AttemptCompleteScreen,
} from "@features/execution";

// M7 Proctoring & Integrity Screens
import {
    LiveSessionMonitorScreen,
    SessionIntegrityDetailScreen,
    IntegrityReviewScreen,
    ReconnectDecisionScreen,
} from "@features/proctoring";

// M8 Grading, Results & Audit Screens
import {
    GradingQueueScreen,
    GradeReviewScreen,
    GradeConfirmationScreen,
    ResultPublicationScreen,
    StudentResultsScreen,
    AuditLogViewerScreen,
    ResultDetailScreen,
} from "@features/results";

// ============================================
// GUARD COMPONENTS
// ============================================

interface RouteGuardProps {
    children: React.ReactNode;
    allowedRoles?: SystemRole[] | undefined;
    requireVerifiedEmail?: boolean;
    requireDevice?: boolean;
}

/**
 * AuthGuard - Protects routes that require authentication
 * - Checks bootstrap status
 * - Checks authentication
 * - Validates user roles
 * - Optional email verification check
 * - Optional device registration check for students
 */
const AuthGuard: React.FC<RouteGuardProps> = ({
    children,
    allowedRoles,
    requireVerifiedEmail = true,
    requireDevice = true
}) => {
    const { isAuthenticated, user, bootstrapStatus } = useAppSelector((state) => state.auth);
    const { data: deviceData, isLoading: devicesLoading } = useGetDevicesQuery(undefined, {
        skip: !isAuthenticated || !user || user.role !== "STUDENT",
    });
    const location = useLocation();

    // 1. Check bootstrap status
    if (bootstrapStatus === "UNINITIALISED") {
        return <Navigate to="/bootstrap" replace />;
    }

    // 2. Check authentication
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    // 3. Check role-based access
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        switch (user.role) {
            case "OWNER":
                return <Navigate to="/owner-console" replace />;
            case "TEACHER":
                return <Navigate to="/teacher-dashboard" replace />;
            case "PROCTOR":
                return <Navigate to="/proctor-dashboard" replace />;
            case "STUDENT":
            default:
                return <Navigate to="/student-dashboard" replace />;
        }
    }

    // 4. Check email verification (skip for OWNER role)
    if (requireVerifiedEmail && user.role !== "OWNER" && !user.isEmailVerified) {
        if (location.pathname !== '/verify-email-nag') {
            return <Navigate to="/verify-email-nag" replace />;
        }
    }

    // 5. Check device registration (only for STUDENTS)
    if (requireDevice && user.role === "STUDENT") {
        const deviceRoutes = [
            '/devices',
            '/devices/register-action',
            '/devices/revoke-confirm',
            '/register-device',
            '/device-limit-reached'
        ];

        if (!devicesLoading && deviceData && deviceData.activeCount === 0) {
            if (!deviceRoutes.some(route => location.pathname.startsWith(route))) {
                return <Navigate to="/devices/register-action" replace />;
            }
        }
    }

    return <>{children}</>;
};

/**
 * PublicGuard - Redirects authenticated users to their dashboard
 * Used for public routes that shouldn't be accessible when logged in
 */
const PublicGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);

    if (isAuthenticated && user) {
        switch (user.role) {
            case "OWNER":
                return <Navigate to="/owner-console" replace />;
            case "TEACHER":
                return <Navigate to="/teacher-dashboard" replace />;
            case "PROCTOR":
                return <Navigate to="/proctor-dashboard" replace />;
            case "STUDENT":
            default:
                return <Navigate to="/student-dashboard" replace />;
        }
    }

    return <>{children}</>;
};

/**
 * ResetPasswordGuard - Ensures reset password page is only accessible with a valid token
 * - Validates token presence in URL
 * - Validates token with API
 * - Handles expired/used tokens
 */
const ResetPasswordGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    // Validate token with API - skip if no token
    const { data: tokenValidation, isLoading, error } = useValidateResetTokenQuery(token || '', {
        skip: !token, // Skip query if no token
    });

    // No token - redirect to forgot password
    useEffect(() => {
        if (!token) {
            navigate('/forgot-password', {
                state: {
                    error: 'Invalid or missing reset token. Please request a new password reset link.'
                }
            });
        }
    }, [token, navigate]);

    // Token validation error - redirect to forgot password
    useEffect(() => {
        if (error) {
            navigate('/forgot-password', {
                state: {
                    error: 'This password reset link has expired or is invalid. Please request a new one.'
                }
            });
        }
    }, [error, navigate]);

    // Token already used - redirect to forgot password
    useEffect(() => {
        if (tokenValidation && tokenValidation.isUsed) {
            navigate('/forgot-password', {
                state: {
                    error: 'This password reset link has already been used. Please request a new one.'
                }
            });
        }
    }, [tokenValidation, navigate]);

    // Show loading while validating
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Validating reset link...</p>
                </div>
            </div>
        );
    }

    // Only render children if token is valid and not used
    if (!token || error || tokenValidation?.isUsed || !tokenValidation?.isValid) {
        return null; // Will redirect via useEffect
    }

    return <>{children}</>;
};


/**
 * DashboardDispatcher - Smart role-based dashboard routing
 */
const DashboardDispatcher: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);

    useGetDevicesQuery(undefined, {
        skip: !user || user.role !== "STUDENT",
    });

    if (!user) return <Navigate to="/login" replace />;

    switch (user.role) {
        case "OWNER":
            return <OwnerConsoleScreen />;
        case "TEACHER":
            return <TeacherDashboardScreen />;
        case "PROCTOR":
            return <ProctorDashboardScreen />;
        case "STUDENT":
        default:
            return <StudentDashboardScreen />;
    }
};


/**
 * DeviceRegistrationWrapper - Ensures students have registered devices
 */
const DeviceRegistrationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { data: deviceData, isLoading } = useGetDevicesQuery(undefined, {
        skip: !isAuthenticated || !user || user.role !== "STUDENT",
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking device status...</p>
                </div>
            </div>
        );
    }

    // For students, check if device registration is needed
    if (user?.role === "STUDENT" && deviceData && deviceData.activeCount === 0) {
        return <Navigate to="/devices/register-action" replace />;
    }

    return <>{children}</>;
};

// ============================================
// ROUTER CONFIGURATION
// ============================================

const router = createBrowserRouter([
    // ============================================
    // PUBLIC ROUTES (No authentication required)
    // ============================================
    { path: "/", element: <PublicGuard><LandingScreen /></PublicGuard> },
    { path: "/bootstrap", element: <PublicGuard><BootstrapScreen /></PublicGuard> },
    { path: "/login", element: <PublicGuard><LoginScreen /></PublicGuard> },
    { path: "/signup", element: <PublicGuard><StudentSignupScreen /></PublicGuard> },
    { path: "/activate-teacher", element: <PublicGuard><TeacherActivationScreen /></PublicGuard> },

    // Password Reset Flow - Public but with guards
    { path: "/forgot-password", element: <PublicGuard><ForgotPasswordScreen /></PublicGuard> },
    { path: "/reset-password", element: (<PublicGuard><ResetPasswordGuard><ResetPasswordScreen /></ResetPasswordGuard></PublicGuard>) },

    // ============================================
    // PROTECTED ROUTES (Authentication required)
    // ============================================

    // M1 - Auth & Identity
    { path: "/verify-email-nag", element: (<AuthGuard requireVerifiedEmail={false}><VerifyEmailNagScreen /></AuthGuard>) },
    { path: "/dashboard", element: <AuthGuard><DashboardDispatcher /></AuthGuard> },
    { path: "/student-dashboard", element: (<AuthGuard allowedRoles={["STUDENT"]}><DeviceRegistrationWrapper><StudentDashboardScreen /></DeviceRegistrationWrapper></AuthGuard>) },
    { path: "/teacher-dashboard", element: <AuthGuard allowedRoles={["TEACHER"]}><TeacherDashboardScreen /></AuthGuard> },
    { path: "/proctor-dashboard", element: <AuthGuard allowedRoles={["PROCTOR"]}><ProctorDashboardScreen /></AuthGuard> },
    { path: "/owner-console", element: <AuthGuard allowedRoles={["OWNER"]}><OwnerConsoleScreen /></AuthGuard> },
    { path: "/profile", element: <AuthGuard><MyProfileScreen /></AuthGuard> },
    { path: "/devices", element: <AuthGuard allowedRoles={["STUDENT"]}><MyDevicesScreen /></AuthGuard> },
    { path: "/register-device", element: <AuthGuard allowedRoles={["STUDENT"]}><RegisterDeviceScreen /></AuthGuard> },
    { path: "/device-limit-reached", element: <AuthGuard allowedRoles={["STUDENT"]}><DeviceLimitReachedScreen /></AuthGuard> },

    // M2 - Exam Registration & Access
    { path: "/catalogue", element: <AuthGuard allowedRoles={["STUDENT", "TEACHER"]}><ExamCatalogueScreen /></AuthGuard> },
    { path: "/exam/:examId", element: <AuthGuard><ExamDetailsScreen /></AuthGuard> },
    { path: "/redeem-invitation", element: <AuthGuard allowedRoles={["STUDENT"]}><InvitationRedemptionScreen /></AuthGuard> },
    { path: "/exam/:examId/request", element: <AuthGuard allowedRoles={["STUDENT"]}><RegistrationRequestScreen /></AuthGuard> },
    { path: "/exam/:examId/status", element: <AuthGuard allowedRoles={["STUDENT"]}><RegistrationStatusScreen /></AuthGuard> },
    { path: "/registration-requests", element: <AuthGuard allowedRoles={["TEACHER"]}><TeacherRegistrationRequestsScreen /></AuthGuard> },
    { path: "/registration-requests/:requestId", element: <AuthGuard allowedRoles={["TEACHER"]}><TeacherRegistrationReviewScreen /></AuthGuard> },
    { path: "/exam/:examId/distribution", element: <AuthGuard allowedRoles={["TEACHER"]}><ExamDistributionStatusScreen /></AuthGuard> },

    // M3 - Question Bank
    { path: "/question-bank", element: <AuthGuard allowedRoles={["TEACHER"]}><QuestionBankListScreen /></AuthGuard> },
    { path: "/question-bank/new", element: <AuthGuard allowedRoles={["TEACHER"]}><QuestionEditorScreen /></AuthGuard> },
    { path: "/question-bank/import", element: <AuthGuard allowedRoles={["TEACHER"]}><QuestionImportScreen /></AuthGuard> },
    { path: "/question-bank/tags", element: <AuthGuard allowedRoles={["TEACHER"]}><QuestionOrganisationScreen /></AuthGuard> },
    { path: "/question-bank/:questionId/edit", element: <AuthGuard allowedRoles={["TEACHER"]}><QuestionEditorScreen /></AuthGuard> },
    { path: "/question-bank/:questionId/preview", element: <AuthGuard allowedRoles={["TEACHER"]}><QuestionPreviewScreen /></AuthGuard> },
    { path: "/question-bank/:questionId/history", element: <AuthGuard allowedRoles={["TEACHER"]}><QuestionVersionHistoryScreen /></AuthGuard> },

    // M4 - Exam Builder & Publication
    { path: "/exams", element: <AuthGuard allowedRoles={["TEACHER"]}><ExamListScreen /></AuthGuard> },
    { path: "/builder/new", element: <AuthGuard allowedRoles={["TEACHER"]}><ExamBuilderScreen /></AuthGuard> },
    { path: "/builder/:examId", element: <AuthGuard allowedRoles={["TEACHER"]}><ExamBuilderScreen /></AuthGuard> },
    { path: "/builder/:examId/settings", element: <AuthGuard allowedRoles={["TEACHER"]}><ExamSettingsAudienceScreen /></AuthGuard> },
    { path: "/builder/:examId/preview", element: <AuthGuard allowedRoles={["TEACHER"]}><ExamPreviewScreen /></AuthGuard> },
    { path: "/builder/:examId/publish", element: <AuthGuard allowedRoles={["TEACHER"]}><PublishExamScreen /></AuthGuard> },
    { path: "/builder/:examId/distribution", element: <AuthGuard allowedRoles={["TEACHER"]}><M4DistributionStatusScreen /></AuthGuard> },

    // M5 - Device & Security Gates
    { path: "/exam/:examId/launch", element: <AuthGuard allowedRoles={["STUDENT"]}><DownloadDesktopAppScreen /></AuthGuard> },
    { path: "/exam/:examId/entry", element: <AuthGuard allowedRoles={["STUDENT"]}><SessionEntryScreen /></AuthGuard> },
    { path: "/exam/:examId/gates", element: <AuthGuard allowedRoles={["STUDENT"]}><DeviceSecurityGatesScreen /></AuthGuard> },
    { path: "/exam/:examId/gate-failed", element: <AuthGuard allowedRoles={["STUDENT"]}><GateFailureScreen /></AuthGuard> },
    { path: "/devices/register-action", element: <AuthGuard allowedRoles={["STUDENT"]}><DeviceRegistrationScreen /></AuthGuard> },
    { path: "/devices/revoke-confirm", element: <AuthGuard allowedRoles={["STUDENT"]}><RevokeDeviceConfirmationScreen /></AuthGuard> },

    // M6 - Exam Session Orchestration
    { path: "/exam/:examId/live", element: <AuthGuard allowedRoles={["STUDENT"]}><LiveExamSessionScreen /></AuthGuard> },
    { path: "/exam/:examId/reconnect", element: <AuthGuard allowedRoles={["STUDENT"]}><ReconnectScreen /></AuthGuard> },
    { path: "/exam/:examId/terminated", element: <AuthGuard allowedRoles={["STUDENT"]}><AttemptTerminatedScreen /></AuthGuard> },
    { path: "/exam/:examId/submitted", element: <AuthGuard allowedRoles={["STUDENT"]}><SubmissionConfirmationScreen /></AuthGuard> },
    { path: "/exam/:examId/complete", element: <AuthGuard allowedRoles={["STUDENT"]}><AttemptCompleteScreen /></AuthGuard> },

    // M7 - Proctoring & Integrity
    { path: "/monitoring", element: <AuthGuard allowedRoles={["TEACHER", "PROCTOR"]}><LiveSessionMonitorScreen /></AuthGuard> },
    { path: "/monitoring/:sessionId", element: <AuthGuard allowedRoles={["TEACHER", "PROCTOR"]}><SessionIntegrityDetailScreen /></AuthGuard> },
    { path: "/monitoring/:sessionId/review", element: <AuthGuard allowedRoles={["TEACHER", "PROCTOR"]}><IntegrityReviewScreen /></AuthGuard> },
    { path: "/monitoring/:sessionId/reconnect-decision", element: <AuthGuard allowedRoles={["TEACHER", "PROCTOR"]}><ReconnectDecisionScreen /></AuthGuard> },

    // M8 - Grading, Results & Audit
    { path: "/grading", element: <AuthGuard allowedRoles={["TEACHER"]}><GradingQueueScreen /></AuthGuard> },
    { path: "/grading/:submissionId", element: <AuthGuard allowedRoles={["TEACHER"]}><GradeReviewScreen /></AuthGuard> },
    { path: "/grading/:submissionId/confirm", element: <AuthGuard allowedRoles={["TEACHER"]}><GradeConfirmationScreen /></AuthGuard> },
    { path: "/grading/publish/:examId", element: <AuthGuard allowedRoles={["TEACHER"]}><ResultPublicationScreen /></AuthGuard> },
    { path: "/results", element: <AuthGuard allowedRoles={["STUDENT"]}><StudentResultsScreen /></AuthGuard> },
    { path: "/results/:resultId", element: <AuthGuard allowedRoles={["STUDENT"]}><ResultDetailScreen /></AuthGuard> },
    { path: "/audit", element: <AuthGuard allowedRoles={["TEACHER", "OWNER"]}><AuditLogViewerScreen /></AuthGuard> },

    // ============================================
    // FALLBACK ROUTES
    // ============================================
    { path: "/404", element: <div>Page not found</div> },
    { path: "*", element: <Navigate to="/" replace /> },
]);

// ============================================
// EXPORT
// ============================================

export const AppRouter: React.FC = () => {
    return <RouterProvider router={router} />;
};

// Export guards for testing
export {
    AuthGuard,
    PublicGuard,
    ResetPasswordGuard,
    DashboardDispatcher,
    DeviceRegistrationWrapper
};