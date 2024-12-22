// src/app/components/Staking/components/StakingForm/StakingForm.tsx
import { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";

import {
  OVERFLOW_HEIGHT_WARNING_THRESHOLD,
  OVERFLOW_TVL_WARNING_THRESHOLD,
} from "@/app/common/constants";
import { LoadingView } from "@/app/components/Loading/Loading";
import { PreviewModal } from "@/app/components/Modals/PreviewModal";
import {
  StakingAmount,
  StakingFee,
  StakingTime,
} from "@/app/components/Staking/Form";
import { ApiUnavailable } from "@/app/components/Staking/Status/ApiUnavailable";
import { StakingCapReached } from "@/app/components/Staking/Status/StakingCapReached";
import { WalletNotConnected } from "@/app/components/Staking/Status/WalletNotConnected";
import { useGlobalParams } from "@/app/context/api/GlobalParamsProvider";
import { useStakingStats } from "@/app/context/api/StakingStatsProvider";
import { useStakingContext } from "@/app/context/Staking/StakingContext";
import { useHealthCheck } from "@/app/hooks/useHealthCheck";
import {
  getCurrentGlobalParamsVersion,
  ParamsWithContext,
} from "@/utils/globalParams";
import { isStakingSignReady } from "@/utils/isStakingSignReady";

import { StakingProps } from "../Staking";
import { ApproachingCapWarning } from "../Status/ApproachingCapWarning";

export type StakingFormProps = Pick<
  StakingProps,
  "onConnect" | "isLoading" | "isWalletConnected"
>;

interface OverflowState {
  isHeightCap: boolean;
  overTheCapRange: boolean;
  approchingCapRange: boolean;
}

export const StakingForm: React.FC<StakingFormProps> = ({
  onConnect,
  isLoading,
  isWalletConnected,
}) => {
  const stakingStats = useStakingStats();
  const globalParams = useGlobalParams();

  const {
    btcHeight,
    stakingFeeSat,
    btcWalletBalanceSat,
    finalityProvider,
    stakingAmountSat,
    stakingTimeBlocks,
    selectedFeeRate,
    mempoolFeeRates,
    previewModalOpen,
    awaitingWalletResponse,
    setStakingAmountSat,
    setStakingTimeBlocks,
    setSelectedFeeRate,
    setPreviewModalOpen,
    resetForm,
    handleSign: onSign,
  } = useStakingContext();

  const [overflow, setOverflow] = useState<OverflowState>({
    isHeightCap: false,
    overTheCapRange: false,
    approchingCapRange: false,
  });

  const [paramWithCtx, setParamWithCtx] = useState<ParamsWithContext>();

  // Calculate params context and overflow state
  useEffect(() => {
    if (!btcHeight || !globalParams.data) {
      return;
    }

    // Get current params version
    const paramCtx = getCurrentGlobalParamsVersion(
      btcHeight + 1,
      globalParams.data,
    );

    setParamWithCtx(paramCtx);

    if (!paramCtx?.currentVersion) {
      return;
    }

    const nextBlockHeight = btcHeight + 1;
    const { stakingCapHeight, stakingCapSat } = paramCtx.currentVersion;

    // Handle height-based cap
    if (stakingCapHeight) {
      setOverflow({
        isHeightCap: true,
        overTheCapRange: nextBlockHeight > stakingCapHeight,
        approchingCapRange:
          nextBlockHeight >=
          stakingCapHeight - OVERFLOW_HEIGHT_WARNING_THRESHOLD,
      });
      return;
    }

    // Handle TVL-based cap
    if (stakingCapSat && stakingStats.data) {
      const { activeTVLSat, unconfirmedTVLSat } = stakingStats.data;
      setOverflow({
        isHeightCap: false,
        overTheCapRange: stakingCapSat <= activeTVLSat,
        approchingCapRange:
          stakingCapSat * OVERFLOW_TVL_WARNING_THRESHOLD < unconfirmedTVLSat,
      });
    }
  }, [btcHeight, globalParams.data, stakingStats.data]);

  const { isApiNormal, isGeoBlocked, apiMessage } = useHealthCheck();

  if (!isApiNormal || isGeoBlocked) {
    return <ApiUnavailable message={apiMessage || ""} />;
  }

  if (!isWalletConnected) {
    return <WalletNotConnected onConnect={onConnect} />;
  }

  if (isLoading) {
    return <LoadingView />;
  }

  if (overflow.overTheCapRange) {
    console.log("overflow.overTheCapRange", overflow.overTheCapRange);
    return <StakingCapReached isHeightCap={overflow.isHeightCap} />;
  }

  if (!paramWithCtx?.currentVersion) {
    return null;
  }

  const {
    minStakingAmountSat,
    maxStakingAmountSat,
    minStakingTimeBlocks,
    maxStakingTimeBlocks,
    unbondingTime,
    confirmationDepth,
    unbondingFeeSat,
  } = paramWithCtx.currentVersion;

  const stakingTimeFixed = minStakingTimeBlocks === maxStakingTimeBlocks;
  const stakingTimeBlocksWithFixed = stakingTimeFixed
    ? minStakingTimeBlocks
    : stakingTimeBlocks;

  const { isReady: signReady, reason: signNotReadyReason } = isStakingSignReady(
    minStakingAmountSat,
    maxStakingAmountSat,
    minStakingTimeBlocks,
    maxStakingTimeBlocks,
    stakingAmountSat,
    stakingTimeBlocksWithFixed,
    !!finalityProvider,
    stakingFeeSat,
  );

  const previewReady = signReady && selectedFeeRate && stakingAmountSat;

  const showApproachingCapWarning = () => {
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

  const handlePreviewModalClose = (isOpen: boolean) => {
    setPreviewModalOpen(isOpen);
  };

  return (
    <div className="flex flex-1 flex-col">
      <p>
        <strong>Step-2:</strong> Set up staking terms
      </p>
      <div className="flex flex-1 flex-col">
        <StakingTime
          minStakingTimeBlocks={minStakingTimeBlocks}
          maxStakingTimeBlocks={maxStakingTimeBlocks}
          unbondingTimeBlocks={unbondingTime}
          onStakingTimeBlocksChange={setStakingTimeBlocks}
          reset={resetForm}
        />
        <StakingAmount
          minStakingAmountSat={minStakingAmountSat}
          maxStakingAmountSat={maxStakingAmountSat}
          btcWalletBalanceSat={btcWalletBalanceSat}
          onStakingAmountSatChange={setStakingAmountSat}
          reset={resetForm}
        />
        {signReady && (
          <StakingFee
            mempoolFeeRates={mempoolFeeRates}
            stakingFeeSat={stakingFeeSat}
            selectedFeeRate={selectedFeeRate}
            onSelectedFeeRateChange={setSelectedFeeRate}
            reset={resetForm}
          />
        )}
        <ApproachingCapWarning />
        <span
          className="cursor-pointer text-xs"
          data-tooltip-id="tooltip-staking-preview"
          data-tooltip-content={signNotReadyReason}
          data-tooltip-place="top"
        >
          <button
            className="btn-primary btn mt-2 w-full"
            disabled={!previewReady}
            onClick={() => setPreviewModalOpen(true)}
          >
            Preview
          </button>
          <Tooltip id="tooltip-staking-preview" className="tooltip-wrap" />
        </span>
        {previewReady && (
          <PreviewModal
            open={previewModalOpen}
            onClose={handlePreviewModalClose}
            onSign={onSign}
            finalityProvider={finalityProvider?.description.moniker}
            stakingAmountSat={stakingAmountSat}
            stakingTimeBlocks={stakingTimeBlocksWithFixed}
            stakingFeeSat={stakingFeeSat}
            confirmationDepth={confirmationDepth}
            feeRate={selectedFeeRate}
            unbondingTimeBlocks={unbondingTime}
            unbondingFeeSat={unbondingFeeSat}
            awaitingWalletResponse={awaitingWalletResponse}
          />
        )}
      </div>
    </div>
  );
};
