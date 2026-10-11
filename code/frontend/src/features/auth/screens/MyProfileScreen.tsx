import React, { useState } from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { logout } from "@redux/slices/authSlice";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Modal } from "@components/ui/Modal";
import { CheckCircle2, LogOut, Mail, User, Smartphone, Key, AlertCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLogoutMutation, useChangePasswordMutation } from "@/redux/services/authApi";

export const MyProfileScreen: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [logoutMutation] = useLogoutMutation();
    const [changePasswordMutation, { isLoading: isChangingPassword }] = useChangePasswordMutation();

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSignOut = async () => {
        try {
            await logoutMutation().unwrap();
        } catch (error) {
            console.warn("Logout failed:", error);
        } finally {
            dispatch(logout());
            navigate("/login", { replace: true });
        }
    };

    const handleOpenPasswordModal = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFormError(null);
        setSuccessMessage(null);
        setIsPasswordModalOpen(true);
    };

    const handleClosePasswordModal = () => {
        setIsPasswordModalOpen(false);
        setFormError(null);
        setSuccessMessage(null);
    };

    const handleChangePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSuccessMessage(null);

        if (!currentPassword) {
            setFormError("Current password is required.");
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            setFormError("New password must be at least 8 characters long.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setFormError("New passwords do not match.");
            return;
        }

        try {
            const res = await changePasswordMutation({
                currentPassword,
                newPassword,
            }).unwrap();

            setSuccessMessage(res.message || "Password changed successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setTimeout(() => {
                handleClosePasswordModal();
            }, 1500);
        } catch (err: any) {
            const msg = err?.data?.message || err?.data?.error?.message || "Failed to change password. Please verify your current password.";
            setFormError(msg);
        }
    };

    const name = user?.fullName || "John Doe";
    const email = user?.email || "john.doe@institution.edu";
    const role = user?.role || "STUDENT";
    const isVerified = user?.isEmailVerified ?? true;

    const getInitials = (fullName: string) => {
        const parts = fullName.trim().split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return fullName.slice(0, 2).toUpperCase();
    };

    return (
        <AppLayout pageTitle="My Profile">
            <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
                    {/* Top Profile Banner & Avatar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-[#4C70A6] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0 ring-4 ring-[#4C70A6]/10">
                                {getInitials(name)}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-slate-900">{name}</h1>
                                    <Badge variant="info">{role}</Badge>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {email}
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            className="text-rose-700 border-rose-200 hover:bg-rose-50 cursor-pointer"
                            icon={<LogOut className="w-3.5 h-3.5" />}
                            onClick={handleSignOut}
                        >
                            Sign out
                        </Button>
                    </div>

                    {/* Account Information Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200/80 flex flex-col gap-1.5">
                            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
                            </div>
                            <div className="text-sm font-bold text-slate-900 font-mono">{email}</div>
                            <div>
                                {isVerified ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verified Institutional Email
                                    </span>
                                ) : (
                                    <Badge variant="warning">Verification Required</Badge>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200/80 flex flex-col gap-1.5">
                            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" /> Account Classification
                            </div>
                            <div className="text-sm font-bold text-slate-900 capitalize">{role.toLowerCase()} Account</div>
                            <div className="text-[11px] text-slate-500">
                                Institutional examination permissions enabled.
                            </div>
                        </div>
                    </div>

                    {/* Device & Security Quick Links */}
                    {role === "STUDENT" && (
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[#4C70A6] shadow-2xs">
                                    <Smartphone className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900">Registered Examination Devices</div>
                                    <div className="text-[11px] text-slate-500">Manage active hardware devices authorized for exams.</div>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => navigate("/devices")}
                            >
                                View Devices
                            </Button>
                        </div>
                    )}

                    {/* Password Security Option */}
                    <div className="bg-slate-50 p-4 rounded-md border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs">
                                <Key className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-900">Account Password</div>
                                <div className="text-[11px] text-slate-500">Update your account password securely.</div>
                            </div>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleOpenPasswordModal}
                        >
                            Change Password
                        </Button>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            <Modal
                isOpen={isPasswordModalOpen}
                onClose={handleClosePasswordModal}
                title="Change Password"
                subtitle="Enter your current password and choose a new secure password."
            >
                <form onSubmit={handleChangePasswordSubmit} className="p-6 flex flex-col gap-4">
                    {formError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-md flex items-center gap-2">
                            <Check className="w-4 h-4 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <Input
                        label="Current Password"
                        type="password"
                        showPasswordToggle
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={isChangingPassword || !!successMessage}
                        required
                    />

                    <Input
                        label="New Password"
                        type="password"
                        showPasswordToggle
                        placeholder="Minimum 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isChangingPassword || !!successMessage}
                        required
                    />

                    <Input
                        label="Confirm New Password"
                        type="password"
                        showPasswordToggle
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isChangingPassword || !!successMessage}
                        required
                    />

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleClosePasswordModal}
                            disabled={isChangingPassword}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            loading={isChangingPassword}
                            disabled={isChangingPassword || !!successMessage}
                        >
                            Update Password
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
};