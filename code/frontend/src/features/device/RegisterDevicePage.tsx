import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Monitor } from "lucide-react";

export default function RegisterDevicePage() {
    const navigate = useNavigate();
    const [deviceLabel, setDeviceLabel] = useState("");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((p) => {
                if (p >= 100) {
                    clearInterval(interval);
                    setTimeout(() => navigate("/my-devices"), 800);
                    return 100;
                }
                return p + 2;
            });
        }, 80);
        return () => clearInterval(interval);
    }, [navigate]);

    const step = progress < 40 ? 0 : progress < 80 ? 1 : 2;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-16 font-display">
            <div className="w-120 rounded-2xl border border-[#d6dbe1] bg-white p-12 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col items-center gap-6">
                    {/* Icon */}
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                        <Monitor size={36} className="text-blue-500" />
                    </div>

                    <h1 className="text-[24px] font-semibold text-gray-900">
                        Registering your device
                    </h1>
                    <p className="text-center text-[15px] leading-normal text-gray-700">
                        {
                            "We're securely registering this device for your account. This helps protect your exams."
                        }
                    </p>

                    {/* Progress dots */}
                    <div className="flex w-full flex-col items-center gap-3">
                        <div className="flex items-center justify-center gap-2">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className={`h-2 w-2 rounded-full transition-all duration-300 ${i === step
                                            ? "w-4 bg-blue-500"
                                            : i < step
                                                ? "bg-[rgba(74,111,165,0.5)]"
                                                : "bg-[rgba(74,111,165,0.2)]"
                                        }`}
                                />
                            ))}
                        </div>
                        <p className="text-[14px] text-gray-400">
                            {progress < 40
                                ? "Collecting device information…"
                                : progress < 80
                                    ? "Verifying security…"
                                    : "Finalizing registration…"}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-[#f0f3f7]">
                        <div
                            className="h-1.5 rounded-full bg-blue-500 transition-all duration-100"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="h-px w-full bg-[#d6dbe1]" />

                    {/* Device label */}
                    <div className="flex w-full flex-col gap-1.5">
                        <label className="text-[14px] font-medium text-gray-900">
                            Device label (optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Home laptop"
                            value={deviceLabel}
                            onChange={(e) => setDeviceLabel(e.target.value)}
                            className="h-11 w-full rounded-xs border-[1.5px] border-[#d6dbe1] bg-white px-4 text-[15px] text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-blue-500"
                        />
                    </div>

                    <p className="text-center text-[13px] text-gray-400">
                        Registration completes automatically. Please keep this window open.
                    </p>
                </div>
            </div>
        </div>
    );
}
