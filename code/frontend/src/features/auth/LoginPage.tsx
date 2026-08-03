import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Logo, Card, Divider, DividerWithText, Input, Button } from "../../components/ui/SharedUIs";

export default function LoginPage() {
    const navigate = useNavigate();
    // const [institution, setInstitution] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [keepSignedIn, setKeepSignedIn] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate("/verify-email");
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-16 font-display">
            <Card className="p-10">
                <div className="flex flex-col items-center gap-4">
                    <Logo size="xl" />
                    <div className="h-xs w-10 bg-blue-500" />
                    <div className="flex flex-col items-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                            Welcome back
                        </h1>
                        <p className="text-base text-gray-700">
                            Sign in to your account.
                        </p>
                    </div>
                    <Divider className="w-full h-0.5" />

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col items-start gap-3"
                    >
                        {/* Institution 
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[14px] font-medium text-gray-900">
                                Institution
                            </label>
                            <input
                                type="text"
                                placeholder="demo-university"
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                                className="h-11 w-110 rounded-xs border-[1.5px] border-[#d6dbe1] bg-white px-4 text-[15px] text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-blue-500"
                            />
                            <p className="text-[13px] text-gray-400">
                                {"Enter your institution's unique slug."}
                            </p>
                        </div>
                        */}

                        {/* Email */}
                        <Input
                            label="Email address"
                            placeholder="you@institution.edu"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        {/* Password */}
                        <Input
                            label="Password"
                            placeholder="Enter your password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        {/* Remember / Forgot */}
                        <div className="flex w-110 items-center justify-between">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={keepSignedIn}
                                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                                    className="h-4 w-4 rounded border border-[#d6dbe1] accent-blue-500"
                                />
                                <span className="text-[14px] text-gray-700">
                                    Keep me signed in
                                </span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-[14px] font-medium text-blue-500 hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Sign in button */}
                        <Button type="submit" fullWidth>Sign in</Button>
                    </form>

                    {/* Divider */}
                    <DividerWithText text="or sign in with" className="w-full text-sm text-gray-500"></DividerWithText>

                    {/* Social buttons */}
                    <div className="flex w-110 items-center justify-center gap-3">
                        {["Google", "Microsoft", "SAML"].map((provider) => (
                            <Button variant="outline" key={provider}>
                                {provider}
                            </Button>
                        ))}
                    </div>
                    <div className="h-xs w-10 bg-blue-500" />

                    <p className="text-sm text-gray-400">
                        {"Don't have an account? "}
                        <Link
                            to="/signup"
                            className="font-medium text-blue-500 hover:underline"
                        >
                            Create one now
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    );
}
