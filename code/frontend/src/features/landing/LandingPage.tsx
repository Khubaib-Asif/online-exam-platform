import { useNavigate } from "react-router";
import { Shield, Brain, BarChart3, Monitor } from "lucide-react";
import { Logo } from "../../components/ui/SharedUIs";

function Navbar() {
    const navigate = useNavigate();
    return (
        <header className="h-20 w-full shrink-0 border-b border-gray-200 bg-white">
            <div className="mx-auto flex h-full max-w-360 items-center justify-between px-10">
                <Logo />
                <nav className="flex gap-8 text-[15px] font-normal text-gray-600">
                    <a
                        href="#features"
                        className="cursor-pointer transition-colors hover:text-gray-900"
                    >
                        Features
                    </a>
                    <a
                        href="#institutions"
                        className="cursor-pointer transition-colors hover:text-gray-900"
                    >
                        For Institutions
                    </a>
                    <a
                        href="#security"
                        className="cursor-pointer transition-colors hover:text-gray-900"
                    >
                        Security
                    </a>
                    <a
                        href="#pricing"
                        className="cursor-pointer transition-colors hover:text-gray-900"
                    >
                        Pricing
                    </a>
                </nav>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/login")}
                        className="h-12 w-25 cursor-pointer rounded-xs border-[1.5px] border-[#d6dbe1] bg-white text-[15px] font-medium text-gray-900 transition-colors hover:bg-gray-50"
                    >
                        Log in
                    </button>
                    <button
                        onClick={() => navigate("/signup")}
                        className="h-12 w-30 cursor-pointer rounded-xs bg-blue-500 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
                    >
                        Sign up
                    </button>
                </div>
            </div>
        </header>
    );
}

function HeroSection() {
    const navigate = useNavigate();
    return (
        <section className="w-full bg-gray-900">
            <div className="mx-auto flex max-w-360 items-center justify-center gap-20 px-20 py-20">
                <div className="flex flex-col items-start gap-5">
                    <h1 className="w-150 text-[44px] leading-12.5 font-bold tracking-tight text-white">
                        Secure Online Exams
                        <br />
                        for Institutions Worldwide
                    </h1>
                    <p className="w-150 text-[18px] leading-[1.6] font-normal text-blue-300">
                        Enterprise-grade exam platform with AI proctoring, secure delivery,
                        and real-time analytics for educational institutions.
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/signup")}
                            className="h-12 w-50 cursor-pointer rounded-xs bg-blue-600 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
                        >
                            Get Started
                        </button>
                        <button className="h-12 w-40 cursor-pointer rounded-xs border-[1.5px] border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] text-[15px] font-medium text-white transition-colors hover:bg-[rgba(255,255,255,0.12)]">
                            Learn More
                        </button>
                    </div>
                    <div className="flex items-center gap-12">
                        <div className="flex flex-col gap-1">
                            <span className="text-[22px] font-semibold text-blue-100">
                                10,000+
                            </span>
                            <span className="text-[14px] text-blue-400">Exams Delivered</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[22px] font-semibold text-blue-100">
                                500+
                            </span>
                            <span className="text-[14px] text-blue-400">Institutions</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[22px] font-semibold text-blue-100">
                                99.9%
                            </span>
                            <span className="text-[14px] text-blue-400">Uptime</span>
                        </div>
                    </div>
                </div>
                <div className="flex h-90 w-125 shrink-0 items-center justify-center rounded-xl bg-gray-800">
                    <p className="text-[16px] text-blue-400">Dashboard Preview</p>
                </div>
            </div>
        </section>
    );
}

const features = [
    {
        icon: <Shield size={20} className="text-blue-500" />,
        title: "End-to-End Encryption",
        description: "All exam data encrypted in transit and at rest.",
    },
    {
        icon: <Brain size={20} className="text-blue-500" />,
        title: "AI Proctoring",
        description: "Real-time monitoring with AI-powered flagging.",
    },
    {
        icon: <BarChart3 size={20} className="text-blue-500" />,
        title: "Analytics",
        description: "Comprehensive reporting and integrity verification.",
    },
    {
        icon: <Monitor size={20} className="text-blue-500" />,
        title: "Any Device",
        description: "Web, desktop, and mobile exam delivery.",
    },
];

function FeaturesSection() {
    return (
        <section id="features" className="w-full bg-white">
            <div className="mx-auto flex max-w-360 flex-col items-center justify-center gap-8 px-20 py-12">
                <h2 className="text-[24px] font-semibold text-gray-900">
                    Built for Modern Education
                </h2>
                <div className="flex w-full max-w-7xl items-center justify-center gap-6">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className="flex flex-1 flex-col items-start gap-2 rounded-lg bg-gray-50 p-5"
                        >
                            <div className="mb-1">{f.icon}</div>
                            <h3 className="text-[16px] font-semibold text-gray-900">
                                {f.title}
                            </h3>
                            <p className="text-[13px] leading-normal text-gray-600">
                                {f.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="w-full bg-blue-900">
            <div className="text-slate-blue mx-auto flex h-16 max-w-360 items-center justify-between px-20 text-[13px]">
                <p>© 2026 Exam Platform. All rights reserved.</p>
                <div className="flex items-center gap-6">
                    <a
                        href="#"
                        className="cursor-pointer transition-colors hover:text-white"
                    >
                        Privacy
                    </a>
                    <a
                        href="#"
                        className="cursor-pointer transition-colors hover:text-white"
                    >
                        Terms
                    </a>
                    <a
                        href="#"
                        className="cursor-pointer transition-colors hover:text-white"
                    >
                        Support
                    </a>
                    <a
                        href="#"
                        className="cursor-pointer transition-colors hover:text-white"
                    >
                        Contact
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-gray-50 font-display">
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <div className="flex-1" />
            <Footer />
        </div>
    );
}
