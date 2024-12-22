// src/app/components/Staking/Status/StakingCapReached.tsx
import Image from "next/image";

import stakingCapReached from "../Form/States/staking-cap-reached.svg";

interface StakingCapReachedProps {
  isHeightCap: boolean;
}

export const StakingCapReached: React.FC<StakingCapReachedProps> = ({
  isHeightCap,
}) => {
  const title = isHeightCap ? "Staking window closed" : "Staking cap reached";
  const message = isHeightCap
    ? "Staking is temporarily disabled due to the staking window being closed."
    : "Staking is temporarily disabled due to the staking cap getting reached.";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <Image src={stakingCapReached} alt={title} />
      <div className="text-center">
        <h3 className="mb-4 font-bold">{title}</h3>
        <p className="text-sm">{message}</p>
        <p className="text-sm">
          Please check your staking history to see if any of your stake is
          tagged overflow.
        </p>
        <p className="text-sm">
          Overflow stake should be unbonded and withdrawn.
        </p>
      </div>
    </div>
  );
};
