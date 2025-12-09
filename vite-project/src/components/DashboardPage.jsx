import React from "react";

export default function DashboardPage({ orders }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-6">
        Selamat datang di sistem belanja sembako SIPASERA.
      </p>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">Pesanan Terbaru</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500">Belum ada pesanan.</p>
        ) : (
          <ul className="divide-y">
            {orders.map((o) => (
              <li key={o.id} className="py-2 flex justify-between">
                <span>Pesanan #{o.id}</span>
                <span className="text-blue-600">{o.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
