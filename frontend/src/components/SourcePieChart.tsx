import React, { useState, useMemo } from "react";
import { PieChart as PieIcon } from "lucide-react";

export const SourcePieChart: React.FC<{ data: any[]; onSliceClick?: (source: string) => void }> = ({ data, onSliceClick }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const radius = 80;
  const innerRadius = 50;
  const center = 100;
  const total = useMemo(() => data.reduce((acc, cur) => acc + cur.value, 0), [data]);

  const createArc = (startAngle: number, endAngle: number, inner: number, outer: number) => {
    const start = (startAngle - 90) * (Math.PI / 180);
    const end = (endAngle - 90) * (Math.PI / 180);
    const x1 = center + outer * Math.cos(start);
    const y1 = center + outer * Math.sin(start);
    const x2 = center + outer * Math.cos(end);
    const y2 = center + outer * Math.sin(end);
    const x3 = center + inner * Math.cos(end);
    const y3 = center + inner * Math.sin(end);
    const x4 = center + inner * Math.cos(start);
    const y4 = center + inner * Math.sin(start);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [`M ${x1} ${y1}`, `A ${outer} ${outer} 0 ${largeArc} 1 ${x2} ${y2}`, `L ${x3} ${y3}`, `A ${inner} ${inner} 0 ${largeArc} 0 ${x4} ${y4}`, "Z"].join(" ");
  };

  const slices = useMemo(() => {
    let currentAngle = 0;
    return data.map((item) => {
      const sliceAngle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle += sliceAngle;
      if (item.value === 0) return null;
      return { ...item, path: createArc(startAngle, endAngle, innerRadius, radius), percentage: ((item.value / total) * 100).toFixed(1) };
    }).filter(Boolean);
  }, [data, total]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Traffic Sources</h3>
          <p className="text-sm text-slate-500">Distribution by channel</p>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><PieIcon className="w-5 h-5" /></div>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-8 h-full">
        <div className="relative w-48 h-48 shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {slices.map((slice, i) => (
              <path key={i} d={slice?.path} fill={slice?.color} stroke="white" strokeWidth="2" className="transition-all duration-300 cursor-pointer hover:opacity-90"
                style={{ transformOrigin: "center", transform: hoveredIndex === i ? "scale(1.05)" : "scale(1)" }}
                onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => { if (onSliceClick && slice?.label) onSliceClick(slice.label); }}
              />
            ))}
            <g className="pointer-events-none">
              <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold fill-slate-800">{hoveredIndex !== null ? data[hoveredIndex].value : total}</text>
              <text x="100" y="115" textAnchor="middle" className="text-xs font-medium fill-slate-400 uppercase tracking-wider">{hoveredIndex !== null ? "Leads" : "Total"}</text>
            </g>
          </svg>
        </div>
        <div className="flex-1 w-full space-y-3">
          {slices.map((slice, i) => (
            <div key={i} className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${hoveredIndex === i ? "bg-slate-50" : ""}`}
              onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => { if (onSliceClick && slice?.label) onSliceClick(slice.label); }}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice?.color }} />
                <span className="text-sm font-medium text-slate-600">{slice?.label}</span>
              </div>
              <div className="text-right">
                <span className="block text-sm font-bold text-slate-800">{slice?.value}</span>
                <span className="text-xs text-slate-400">{slice?.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
