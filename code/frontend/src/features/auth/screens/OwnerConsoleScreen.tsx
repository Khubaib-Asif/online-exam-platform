import React, { useState } from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Modal } from "@components/ui/Modal";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import {
  UserPlus,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  useGetTeacherInvitationsQuery,
  useCreateTeacherInvitationMutation,
  useRevokeTeacherInvitationMutation,
} from "@/redux/services/bootstrapApi";

export const OwnerConsoleScreen: React.FC = () => {
  const {
    data: invitations = [],
    isLoading: isListLoading,
    error: listError,
    refetch,
  } = useGetTeacherInvitationsQuery();

  const [createTeacherInvitation, { isLoading: isInviting }] = useCreateTeacherInvitationMutation();
  const [revokeTeacherInvitation, { isLoading: isRevoking }] = useRevokeTeacherInvitationMutation();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Success result modal
  const [createdInvite, setCreatedInvite] = useState<{
    email: string;
    token: string;
    expiresAt: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Revoke target modal
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherEmail) return;

    setInviteError(null);
    try {
      const response = await createTeacherInvitation({ email: newTeacherEmail.trim().toLowerCase() }).unwrap();
      setIsInviteModalOpen(false);
      setNewTeacherEmail("");
      setCreatedInvite({
        email: response.email || newTeacherEmail,
        token: response.invitationToken,
        expiresAt: response.expiresAt,
      });
    } catch (err: any) {
      setInviteError(err.data?.message || err.message || "Failed to create teacher invitation.");
    }
  };

  const handleConfirmRevoke = async (id: string) => {
    try {
      await revokeTeacherInvitation(id).unwrap();
      setRevokingId(null);
    } catch (err: any) {
      console.error("Failed to revoke teacher invitation:", err);
    }
  };

  const getActivationUrl = (token: string) => {
    return `${window.location.origin}/activate-teacher?token=${token}`;
  };

  const handleCopyLink = (token: string) => {
    const url = getActivationUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout pageTitle="Owner Console">
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        {/* Console Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Owner Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage deployment initialisation, teacher access, and system security credentials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => refetch()}
              disabled={isListLoading}
            >
              Refresh
            </Button>
            <Badge variant="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              Owner: Active
            </Badge>
          </div>
        </div>

        {/* Teacher Invitations Card */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Teacher Invitations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Issue single-use invitations to onboard authorised instructors into the institution.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setInviteError(null);
                setIsInviteModalOpen(true);
              }}
            >
              Send Invitation
            </Button>
          </div>

          {listError && (
            <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load invitations from backend. Please refresh.</span>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued On</TableHead>
                <TableHead>Expires On</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isListLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2 text-xs font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                      Loading invitations from database...
                    </div>
                  </TableCell>
                </TableRow>
              ) : invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-10 text-xs">
                    No teacher invitations issued yet. Click <strong>Send Invitation</strong> above to onboard your first teacher.
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-slate-900 font-mono text-xs">
                      {inv.email}
                    </TableCell>
                    <TableCell>
                      {inv.status === "ISSUED" ? (
                        <Badge variant="info" icon={<Clock className="w-3 h-3" />}>
                          Issued (Pending)
                        </Badge>
                      ) : inv.status === "REDEEMED" ? (
                        <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                          Redeemed
                        </Badge>
                      ) : inv.status === "EXPIRED" ? (
                        <Badge variant="warning" icon={<AlertTriangle className="w-3 h-3" />}>
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {formatDate(inv.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {formatDate(inv.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "ISSUED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setRevokingId(inv.id)}
                        >
                          Revoke
                        </Button>
                      )}
                      {inv.status === "REDEEMED" && (
                        <span className="text-[11px] text-emerald-600 font-medium">Active Account</span>
                      )}
                      {(inv.status === "REVOKED" || inv.status === "EXPIRED") && (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Authorized Teacher"
        subtitle="Send an invitation to onboard a new teacher to create and supervise examinations."
      >
        <form onSubmit={handleSendInvite} className="p-6 flex flex-col gap-4">
          {inviteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <Input
            label="Teacher Institutional Email"
            type="email"
            placeholder="prof.name@institution.edu"
            icon={<Mail className="w-4 h-4" />}
            value={newTeacherEmail}
            onChange={(e) => setNewTeacherEmail(e.target.value)}
            disabled={isInviting}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={isInviting}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invitation Created & Activation Link Modal */}
      <Modal
        isOpen={!!createdInvite}
        onClose={() => setCreatedInvite(null)}
        title="Teacher Invitation Dispatched"
        subtitle="The invitation has been securely created in the system."
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              An invitation email has been sent to <strong>{createdInvite?.email}</strong>. The link will expire on {formatDate(createdInvite?.expiresAt)}.
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-700">
              Teacher Activation Link (One-Time Use)
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={createdInvite ? getActivationUrl(createdInvite.token) : ""}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-mono p-2.5 rounded-md text-slate-800 focus:outline-hidden select-all"
              />
              <Button
                variant={copiedLink ? "secondary" : "primary"}
                size="sm"
                icon={copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={() => createdInvite && handleCopyLink(createdInvite.token)}
              >
                {copiedLink ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              You can copy this link and share it directly with the instructor if email delivery is delayed.
            </p>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-100 mt-2">
            <Button
              size="sm"
              onClick={() => setCreatedInvite(null)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={!!revokingId}
        onClose={() => setRevokingId(null)}
        title="Revoke Teacher Invitation"
        subtitle="Are you sure you want to invalidate this invitation?"
      >
        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs text-slate-600">
            Once revoked, the recipient will no longer be able to use the invitation link or create an account. This action cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRevokingId(null)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-rose-600 text-white hover:bg-rose-700 border-rose-600"
              loading={isRevoking}
              onClick={() => revokingId && handleConfirmRevoke(revokingId)}
            >
              Revoke Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};