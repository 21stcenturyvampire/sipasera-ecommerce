import React, { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🛒</div>
          <h1 className="text-3xl font-bold text-slate-800">SIPASERA</h1>
          <p className="text-slate-600 mt-2">Sistem Belanja Sembako</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(email, password);
          }}
          className="space-y-4"
        >
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Masuk
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          <p>Demo: admin@sipasera.com / admin</p>
          <p>Demo: warung1@example.com / user</p>
        </div>
      </div>
    </div>
  );
}
