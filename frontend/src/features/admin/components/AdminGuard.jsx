import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/useAuth.js";

export default function AdminGuard() {
    const { user, loading } = useAuth()

    if (loading) return null

    if (!user || user.role !== "admin")
        return <Navigate to="/" replace />

    return <Outlet />
}