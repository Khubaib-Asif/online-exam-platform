import { BrowserRouter, Routes, Route } from "react-router";
import LandingPage from "./features/landing/LandingPage";
import LoginPage from "./features/auth/LoginPage";
import SignupPage from "./features/auth/SignupPage";
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import CheckEmailPage from "./features/auth/CheckEmailPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";
import VerifyEmailPage from "./features/auth/VerifyEmailPage";
import RegisterDevicePage from "./features/device/RegisterDevicePage";
import MyDevicesPage from "./features/device/MyDevicesPage";
import MyProfilePage from "./features/profile/MyProfilePage";
import PageNotFound from "./features/wrongroute/PageNotFound";
export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/check-email" element={<CheckEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/register-device" element={<RegisterDevicePage />} />
                <Route path="/my-devices" element={<MyDevicesPage />} />
                <Route path="/profile" element={<MyProfilePage />} />
                <Route path="*" element={<PageNotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
