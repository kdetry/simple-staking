import { useStakingContext } from "@/app/context/Staking/StakingContext";

export const ApproachingCapWarning = () => {
  const { overflow } = useStakingContext();

  if (!overflow.approchingCapRange) {
    return null;
  }

  return (
    <p className="text-center text-sm text-error">
      {overflow.isHeightCap
        ? "Staking window is closing. Your stake may overflow!"
        : "Staking cap is filling up. Your stake may overflow!"}
    </p>
  );
};
