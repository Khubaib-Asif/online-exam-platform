import { useNavigate } from 'react-router';

export default function PageNotFound() {
    const navigate = useNavigate();
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-16 font-display">
            <h1 className="text-[22px] font-semibold text-gray-900">Page Not Found</h1>
            <p className="text-[14px] text-gray-600">
                The page you are looking for does not exist.
            </p>
            <button className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 cursor-pointer" onClick={() => navigate('/')}>
                Back to Home
            </button>
        </div>
    );
}