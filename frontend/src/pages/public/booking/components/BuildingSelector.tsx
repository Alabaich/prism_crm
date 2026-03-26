import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, AlertCircle, Building2 } from 'lucide-react';

interface BuildingSelectorProps {
  buildings?: string[]; // Optional, щоб TypeScript не сварився, якщо батьківський компонент все ще передає цей пропс
  selected: string;
  onSelect: (building: string) => void;
}

interface BuildingData {
  name: string;
  city: string | null;
}

export default function BuildingSelector({ selected, onSelect }: BuildingSelectorProps) {
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/bookings/buildings`);
        if (!response.ok) throw new Error('Failed to fetch buildings');
        
        const data = await response.json();
        
        const formattedData: BuildingData[] = data.map((item: any) => 
          typeof item === 'string' ? { name: item, city: 'Other Locations' } : item
        );
        
        setBuildings(formattedData);
        
        // Auto-select first building only if nothing is selected
        if (formattedData.length > 0 && !selected) {
          onSelect(formattedData[0].name);
        }
      } catch (err) {
        console.error(err);
        setError('Could not load locations.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuildings();
    
    // Disable linter warning because we ONLY want this to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mr-3" />
        <span className="text-sm text-zinc-500 font-medium">Loading available locations...</span>
      </div>
    );
  }

  if (error || buildings.length === 0) {
    return (
      <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
        <span className="text-sm">{error || 'No locations currently available for booking.'}</span>
      </div>
    );
  }

  const groupedBuildings = buildings.reduce((acc, curr) => {
    const city = curr.city || 'Other Locations';
    if (!acc[city]) acc[city] = [];
    acc[city].push(curr.name);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedBuildings).map(([city, buildingNames]) => (
        <div key={city} className="space-y-3">
          <label className="flex items-center text-sm font-semibold text-zinc-900 ml-1 uppercase tracking-wide">
            <Building2 className="w-4 h-4 mr-1.5 text-zinc-400" />
            {city}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {buildingNames.map((buildingName) => {
              const isSelected = selected === buildingName;
              
              return (
                <button
                  key={buildingName}
                  type="button"
                  onClick={() => onSelect(buildingName)}
                  className={`
                    relative flex items-center p-4 rounded-xl border-2 text-left transition-all duration-200
                    ${isSelected 
                      ? 'border-zinc-900 bg-zinc-900/5 shadow-sm ring-1 ring-zinc-900/5' 
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                    }
                  `}
                >
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full mr-4 shrink-0 transition-colors
                    ${isSelected ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}
                  `}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${isSelected ? 'text-zinc-900' : 'text-zinc-700'}`}>
                      {buildingName}
                    </div>
                    <div className={`text-xs mt-0.5 ${isSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      In-person tour
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}