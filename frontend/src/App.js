import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Battles from "@/pages/Battles";
import CreateRoom from "@/pages/CreateRoom";
import JoinRoom from "@/pages/JoinRoom";
import RoomLobby from "@/pages/RoomLobby";
import LudoGame from "@/pages/LudoGame";
import Wallet from "@/pages/Wallet";
import AddCash from "@/pages/AddCash";
import Withdraw from "@/pages/Withdraw";
import Profile from "@/pages/Profile";
import Support from "@/pages/Support";
import ReferEarn from "@/pages/ReferEarn";
import History from "@/pages/History";
import Notifications from "@/pages/Notifications";
import KYC from "@/pages/KYC";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminPanel from "@/pages/admin/AdminPanel";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-shell flex items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/battles" element={<Protected><Battles /></Protected>} />
      <Route path="/create-room" element={<Protected><CreateRoom /></Protected>} />
      <Route path="/join-room" element={<Protected><JoinRoom /></Protected>} />
      <Route path="/lobby/:battleId" element={<Protected><RoomLobby /></Protected>} />
      <Route path="/game/:battleId" element={<Protected><LudoGame /></Protected>} />
      <Route path="/wallet" element={<Protected><Wallet /></Protected>} />
      <Route path="/wallet/add" element={<Protected><AddCash /></Protected>} />
      <Route path="/wallet/withdraw" element={<Protected><Withdraw /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/support" element={<Protected><Support /></Protected>} />
      <Route path="/refer" element={<Protected><ReferEarn /></Protected>} />
      <Route path="/history" element={<Protected><History /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/kyc" element={<Protected><KYC /></Protected>} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/panel" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
