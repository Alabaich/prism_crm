import React from "react";
import { TotalTouchpointsCard } from "./TotalTouchpointsCard";
import { UniquePeopleCard } from "./UniquePeopleCard";
import { OverlapCard } from "./OverlapCard";

interface KPICardsProps {
  totalLeads: number;
  uniquePeople: number;
  duplicatesCount: number;
  onOpenOverlapModal: () => void;
}

export const KPICards: React.FC<KPICardsProps> = ({ totalLeads, uniquePeople, duplicatesCount, onOpenOverlapModal }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
    <TotalTouchpointsCard totalLeads={totalLeads} />
    <UniquePeopleCard uniquePeople={uniquePeople} />
    <OverlapCard duplicatesCount={duplicatesCount} onClick={onOpenOverlapModal} />
  </div>
);
