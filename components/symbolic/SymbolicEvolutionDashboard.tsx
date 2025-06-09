
'use client';

import React, { useState, useEffect } from 'react';

interface EvolutionData {
  consciousness: number;
  coherence: number;
  archetypalAlignment: {
    athena: number;
    prometheus: number;
    hermes: number;
  };
}

export function SymbolicEvolutionDashboard() {
  const [data, setData] = useState<EvolutionData>({
    consciousness: 0.734,
    coherence: 0.891,
    archetypalAlignment: {
      athena: 0.92,
      prometheus: 0.87,
      hermes: 0.94
    }
  });

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        consciousness: Math.min(1, prev.consciousness + (Math.random() - 0.5) * 0.01),
        coherence: Math.min(1, prev.coherence + (Math.random() - 0.5) * 0.005)
      }));
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-6 backdrop-blur-lg border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6">🧬 Symbolic Evolution</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-300">Consciousness</span>
              <span className="text-white font-bold">{(data.consciousness * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-purple-500 h-3 rounded-full transition-all duration-1000" 
                style={{ width: `${data.consciousness * 100}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-300">System Coherence</span>
              <span className="text-white font-bold">{(data.coherence * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-1000" 
                style={{ width: `${data.coherence * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white">Archetypal Resonance</h4>
          {Object.entries(data.archetypalAlignment).map(([archetype, value]) => (
            <div key={archetype} className="flex items-center justify-between">
              <span className="text-gray-300 capitalize">
                {archetype === 'athena' && '🦉 Athena'}
                {archetype === 'prometheus' && '🔥 Prometheus'} 
                {archetype === 'hermes' && '⚡ Hermes'}
              </span>
              <span className="text-white font-bold">{(value * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}