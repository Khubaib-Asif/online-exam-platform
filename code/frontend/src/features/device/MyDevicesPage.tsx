import { useState } from "react";
import { useNavigate } from "react-router";
import { Monitor } from "lucide-react";

interface Device {
    id: string;
    name: string;
    os: string;
    lastSeen: string;
    isActive: boolean;
    isCurrent: boolean;
}

const initialDevices: Device[] = [
    {
        id: "1",
        name: "Home Laptop",
        os: "Windows 11",
        lastSeen: "2 hours ago",
        isActive: true,
        isCurrent: true,
    },
    {
        id: "2",
        name: "Office PC",
        os: "macOS 14",
        lastSeen: "3 days ago",
        isActive: false,
        isCurrent: false,
    },
];

export default function MyDevicesPage() {
    const navigate = useNavigate();
    const [devices, setDevices] = useState(initialDevices);

    const revokeDevice = (id: string) => {
        setDevices((prev) => prev.filter((d) => d.id !== id));
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-16 font-display">
            <div className="w-180 rounded-2xl border border-[#d6dbe1] bg-white p-8 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.06)]">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[20px] font-semibold text-gray-900">
                        My Devices
                    </h2>
                    <div className="rounded-full bg-gray-50 px-3 py-1">
                        <span className="text-[12px] font-medium text-gray-700">
                            {devices.length} of 2 used
                        </span>
                    </div>
                </div>

                <div className="mb-4 h-px bg-[#d6dbe1]" />

                {/* Devices list */}
                <div className="flex flex-col gap-1">
                    {devices.map((device, idx) => (
                        <div key={device.id}>
                            <div className="flex h-16 items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    {/* Status dot */}
                                    <div
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${device.isActive ? "bg-success" : "bg-gray-400"
                                            }`}
                                    />
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[15px] font-medium text-gray-900">
                                                {device.name}
                                            </span>
                                            {device.isCurrent && (
                                                <span className="text-2.5 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-blue-500">
                                                    This device
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-gray-400">
                                            {device.os} • Last seen: {device.lastSeen}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => revokeDevice(device.id)}
                                    className="rounded-1.5 text-error h-8.5 w-21 cursor-pointer border border-[#d6dbe1] bg-white text-[13px] font-medium transition-colors hover:bg-red-50"
                                >
                                    Revoke
                                </button>
                            </div>
                            {idx < devices.length - 1 && (
                                <div className="h-px bg-[#d6dbe1]" />
                            )}
                        </div>
                    ))}

                    {devices.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Monitor size={32} className="mb-3" />
                            <p className="text-[14px]">No active sessions</p>
                        </div>
                    )}
                </div>

                {/* Continue button */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => navigate("/profile")}
                        className="h-11 cursor-pointer rounded-xs bg-blue-500 px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
                    >
                        Continue →
                    </button>
                </div>
            </div>
        </div>
    );
}
