'use client';

import React from 'react';

export function VaultIndicator() {
  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-blue-900/50 rounded-2xl p-6 backdrop-blur-lg border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4">🔐 Vault Status</h3>
      <div className="text-gray-300">
        Secure vault access and status monitoring
      </div>
    </div>
  );
}