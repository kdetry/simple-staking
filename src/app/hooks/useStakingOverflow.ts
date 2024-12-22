// src/app/hooks/useStakingOverflow.ts
import { useEffect, useState } from "react";

import {
  OVERFLOW_HEIGHT_WARNING_THRESHOLD,
  OVERFLOW_TVL_WARNING_THRESHOLD,
} from "@/app/common/constants";
import { useStakingStats } from "@/app/context/api/StakingStatsProvider";
import {
  getCurrentGlobalParamsVersion,
  ParamsWithContext,
} from "@/utils/globalParams";

import { useGlobalParams } from "../context/api/GlobalParamsProvider";

interface OverflowState {
  isHeightCap: boolean;
  overTheCapRange: boolean;
  approchingCapRange: boolean;
}

export interface UseStakingOverflowReturn {
  overflow: OverflowState;
  paramWithCtx: ParamsWithContext | undefined;
}

export const useStakingOverflow = (
  btcHeight: number | undefined,
): UseStakingOverflowReturn => {
  const stakingStats = useStakingStats();

  const globalParams = useGlobalParams();

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

  return {
    overflow,
    paramWithCtx,
  };
};
