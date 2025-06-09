'use client';

import React from 'react';
import Image from 'next/image';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid-16" />
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 bg-blue-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center space-y-8">
        {/* Logo container with glow effect */}
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute inset-0 animate-pulse">
            <div className="h-32 w-32 bg-blue-500/20 rounded-full blur-xl" />
          </div>
          
          {/* Logo */}
          <div className="relative animate-bounce">
            <Image
              src="/secretsagent logo.png"
              alt="Secrets Agent"
              width={128}
              height={128}
              className="rounded-2xl shadow-2xl border-2 border-blue-400/30"
              priority
            />
          </div>
          
          {/* Inner glow ring */}
          <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/50 animate-ping" />
        </div>

        {/* Loading text */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white animate-fade-in">
            Secrets Agent
          </h1>
          <p className="text-blue-200 animate-fade-in animation-delay-300">
            Initializing secure environment...
          </p>
        </div>

        {/* Animated loading bar */}
        <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-loading-bar" />
        </div>

        {/* Pulsing dots */}
        <div className="flex space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-3 w-3 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>

      {/* Bottom security badge */}
      <div className="absolute bottom-8 flex items-center space-x-2 text-slate-400 text-sm">
        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
        <span>Enterprise Security Platform</span>
      </div>
    </div>
  );
};

export default LoadingScreen; 