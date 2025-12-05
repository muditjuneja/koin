'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { ConsoleIcon } from '../ConsoleIcon';
import { hexToRgb } from '../../lib/system-colors';

interface CabinetLoadingProps {
  system?: string;
  systemColor?: string;
}

export default function CabinetLoading({ system, systemColor = '#00FF41' }: CabinetLoadingProps) {
  // Convert hex to RGB for rgba() format to enable smooth transitions
  const rgb = useMemo(() => hexToRgb(systemColor), [systemColor]);

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center">
      <div className="relative">
        {/* Arcade cabinet silhouette */}
        <div className="w-64 h-80 bg-gray-900 rounded-t-3xl border-4 border-gray-800 relative overflow-hidden">
          {/* Screen area */}
          <div className="absolute top-8 left-4 right-4 h-40 bg-black rounded-lg border-2 border-gray-700 flex items-center justify-center">
            <div className="text-center">
              {system && (
                <div
                  className="mb-4 transition-colors duration-500 ease-out"
                  style={{ color: systemColor }}
                >
                  <ConsoleIcon system={system} size={48} />
                </div>
              )}
              <Loader2
                className="w-12 h-12 animate-spin mx-auto mb-3 transition-colors duration-500 ease-out"
                style={{ color: systemColor }}
              />
              <p
                className="font-mono text-sm animate-pulse transition-colors duration-500 ease-out"
                style={{ color: systemColor }}
              >
                LOADING...
              </p>
            </div>
          </div>
          {/* Control panel */}
          <div className="absolute bottom-4 left-4 right-4 h-20 bg-gray-800 rounded-lg flex items-center justify-center gap-4">
            <div
              className="w-8 h-8 rounded-full border-2 animate-pulse transition-all duration-500 ease-out"
              style={{
                backgroundColor: `rgba(${rgb}, 0.25)`,
                borderColor: systemColor,
              }}
            />
            <div
              className="w-8 h-8 rounded-full border-2 transition-all duration-500 ease-out"
              style={{
                backgroundColor: `rgba(${rgb}, 0.19)`,
                borderColor: systemColor,
              }}
            />
            <div
              className="w-8 h-8 rounded-full border-2 transition-all duration-500 ease-out"
              style={{
                backgroundColor: `rgba(${rgb}, 0.19)`,
                borderColor: systemColor,
              }}
            />
          </div>
        </div>
        {/* Cabinet base */}
        <div className="w-64 h-8 bg-gray-900 border-4 border-t-0 border-gray-800 rounded-b-lg" />
      </div>
      <p
        className="text-xs mt-6 font-mono animate-pulse transition-colors duration-500 ease-out"
        style={{ color: systemColor }}
      >
        Initializing cartridge...
      </p>
    </div>
  );
}

