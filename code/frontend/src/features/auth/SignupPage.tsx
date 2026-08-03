import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Upload, ArrowLeft } from "lucide-react";
import { Card, Divider, Input, Label } from "../../components/ui/SharedUIs";

// const PASSWORD_RULES = [
//     "At least 12 characters",
//     "Uppercase and lowercase letters",
//     "At least one number",
//     "At least one special character",
// ];

export default function SignupPage() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    // const [institution, setInstitution] = useState("");
    const [password, setPassword] = useState("");
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate("/verify-email");
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-16 py-12 font-display">
            <Card className="p-10">
                <div className="flex flex-col items-center gap-4">
                    <Link
                        to="/login"
                        className="w-fit self-start text-sm font-medium text-blue-500 hover:underline"
                    >
                        <ArrowLeft size={16} className="inline-block" /> Back to sign in
                    </Link>
                    <div className="flex flex-col items-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                            Create your account
                        </h1>
                        <p className="text-base text-gray-700">
                            Start your journey with Exam Platform.
                        </p>
                    </div>

                    <Divider className="w-full h-0.5" />

                    <form
                        onSubmit={handleSubmit}
                        className="flex w-130 flex-col items-start gap-2.5"
                    >
                        {/* Photo upload */}
                        <Label>Profile photo</Label>
                        <div className="flex h-20 w-full cursor-pointer items-center justify-center gap-4 rounded-xs border-[1.5px] border-dashed border-[#d6dbe1] bg-gray-50 transition-colors hover:bg-gray-100">
                            <Upload size={20} className="text-gray-400" />
                            <span className="text-[14px] text-gray-400">
                                {"Click to upload or drag & drop a photo"}
                            </span>
                        </div>

                        {/* First name */}
                        <Input
                            label="First name"
                            placeholder="John"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />

                        {/* Last name */}
                        <Input
                            label="Last name"
                            placeholder="Doe"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />

                        {/* Email */}
                        <Input
                            label="Email address"
                            placeholder="you@institution.edu"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        {/* Institution */}
                        {/* <label className="text-[14px] font-medium text-gray-900">
                            Institution
                        </label>
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Search for your institution"
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                                className="h-11 w-full rounded-xs border-[1.5px] border-[#d6dbe1] bg-white pr-10 pl-4 text-[15px] text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-blue-500"
                            />
                            <ChevronDown
                                size={18}
                                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
                            />
                        </div>
                        <p className="text-[13px] text-gray-400">
                            Search by institution name or code.
                        </p> */}

                        {/* Password */}
                        <Input
                            label="Password"
                            placeholder="••••••••••••"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <p className="text-sm text-gray-400">
                            Min 12 chars: uppercase, lowercase, number, special
                        </p>

                        {/* Password rules */}
                        {/* <div className="flex w-full flex-col gap-1 rounded-xs bg-gray-50 px-4 py-3">
                            {PASSWORD_RULES.map((rule) => (
                                <div key={rule} className="flex items-center gap-2">
                                    <Check size={12} className="text-gray-700" />
                                    <span className="text-[13px] text-gray-700">{rule}</span>
                                </div>
                            ))}
                        </div> */}

                        {/* Terms */}
                        <label className="flex w-full cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="h-4 w-4 rounded border border-[#d6dbe1] accent-blue-500"
                            />
                            <span className="text-[14px] text-gray-700">
                                I agree to the Terms and Conditions
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="h-12 w-full cursor-pointer rounded-xs bg-blue-500 text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            Create account
                        </button>
                    </form>

                    <div className="h-xs w-10 bg-blue-500" />

                    <p className="text-sm text-gray-400">
                        {"Already have an account? "}
                        <Link
                            to="/login"
                            className="font-medium text-blue-500 hover:underline"
                        >Sign in</Link>
                    </p>
                </div>
            </Card>
        </div>
    );
}
