import React, { useState } from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Modal } from "@components/ui/Modal";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { UserPlus, Mail, ShieldCheck, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { useCreateTeacherInvitationMutation } from "@/redux/services/bootstrapApi";

interface TeacherInvitation {
  id: string;
  email: string;
  status: "Issued" | "Redeemed" | "Revoked";
  expiresIn: string;
}

export const OwnerConsoleScreen: React.FC = () => {
  const [createTeacherInvitation, { isLoading }] = useCreateTeacherInvitationMutation();
  const [invitations, setInvitations] = useState<TeacherInvitation[]>([
    {
      id: "inv-01",
      email: "teacher@institution.edu",
      status: "Issued",
      expiresIn: "7 days",
    },
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherEmail) return;

    setError(null);
    try {
      const response = await createTeacherInvitation({ email: newTeacherEmail }).unwrap();
      setInvitations((prev) => [
        {
          id: response.token || `inv-${Date.now()}`,
          email: newTeacherEmail,
          status: "Issued",
          expiresIn: "7 days",
        },
        ...prev,
      ]);
      setNewTeacherEmail("");
      setIsInviteModalOpen(false);
    } catch (err: any) {
      setError(err.data?.message || err.message || "Failed to create teacher invitation.");
    }
  };

  const handleRevoke = (id: string) => {
    setInvitations((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "Revoked" } : inv))
    );
  };

  return (
    <AppLayout pageTitle="Owner Console">
      <div className="flex flex-col gap-6">
        {/* Console Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Owner Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage deployment initialisation, teacher access, and system security credentials.
            </p>
          </div>
          <Badge variant="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Owner: Active
          </Badge>
        </div>

        {/* Teacher Invitations Card */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Teacher Invitations
              </h2>
              <p className="text-xs text-slate-500">
                Issue single-use invitations to onboard authorised teachers.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsInviteModalOpen(true)}
            >
              Send Invitation
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                    No teacher invitations issued yet.
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-slate-900">
                      {inv.email}
                    </TableCell>
                    <TableCell>
                      {inv.status === "Issued" ? (
                        <Badge variant="info" icon={<Clock className="w-3 h-3" />}>
                          Issued
                        </Badge>
                      ) : inv.status === "Redeemed" ? (
                        <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                          Redeemed
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">
                      {inv.expiresIn}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "Issued" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => handleRevoke(inv.id)}
                        >
                          Revoke
                        </Button>
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
        title="Invite Teacher"
        subtitle="Send a single-use invitation link to onboard a new teacher."
      >
        <form onSubmit={handleSendInvite} className="flex flex-col gap-4">
          <Input
            label="Teacher Institutional Email"
            type="email"
            placeholder="teacher@institution.edu"
            icon={<Mail className="w-4 h-4" />}
            value={newTeacherEmail}
            onChange={(e) => setNewTeacherEmail(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
};