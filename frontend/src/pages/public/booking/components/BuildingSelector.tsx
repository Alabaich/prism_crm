import React from "react";

interface Props {
  buildings: string[];
  selected: string;
  onSelect: (building: string) => void;
}

const BuildingSelector: React.FC<Props> = ({ buildings, selected, onSelect }) => (
  <div>
    <label className="block text-sm font-medium text-zinc-700 mb-2">Building</label>
    <div className="grid grid-cols-2 gap-4">
      {buildings.map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onSelect(b)}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            selected === b
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-200 hover:border-zinc-400"
          }`}
        >
          <div className="font-medium text-zinc-900">{b}</div>
        </button>
      ))}
    </div>
  </div>
);

export default BuildingSelector;