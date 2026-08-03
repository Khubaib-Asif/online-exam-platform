import { useNavigate } from "react-router";
import { Mail } from "lucide-react";
import { Button, Card, Input } from "../../components/ui/SharedUIs";

export default function VerifyEmailPage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-16 font-display">
            <Card className="p-10">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xs bg-gray-100">
                        <Mail size={28} className="text-blue-500" />
                    </div>

                    <div className="flex flex-col items-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                            Verify your email
                        </h1>
                        <p className="text-base text-gray-700">
                            We've sent a verification link to:
                        </p>
                    </div>
                    <Input
                        type="email"
                        value="you@institution.edu"
                        readonly
                        disabled
                        className="bg-gray-500"
                    />
                    <p className="text-base text-gray-700">Please check your inbox and click the verification link.</p>

                    <div className="h-2" />
                    <div className="h-2" />

                    <div className="flex items-center justify-center gap-3 w-full h-">
                        <Button variant="primary" size="md" fullWidth onClick={() => navigate("/login")}>
                            Back to Login
                        </Button>
                        <Button variant="outline" size="md" fullWidth onClick={() => navigate("/forgot-password")}>
                            Resend Email
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
