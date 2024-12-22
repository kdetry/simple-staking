// src/app/hooks/useStakingForm.ts
import { networks } from "bitcoinjs-lib";
import { useMemo } from "react";

import { createStakingTx } from "@/utils/delegations/signStakingTx";
import { UTXO } from "@/utils/wallet/wallet_provider";

import { useStakingContext } from "../context/Staking/StakingContext";
import { ErrorState } from "../types/errors";

import { UseStakingOverflowReturn } from "./useStakingOverflow";

export type TStakingFormProps = {
  btcWalletNetwork?: networks.Network;
  address?: string;
  publicKeyNoCoord: string;
  availableUTXOs?: UTXO[];
  paramWithCtx: UseStakingOverflowReturn["paramWithCtx"];
  showError: (error: {
    error: { message: string; errorState: ErrorState };
    retryAction: () => void;
  }) => void;
  defaultFeeRate: number;
  minFeeRate: number;
};

export const useStakingForm = ({
  btcWalletNetwork,
  address,
  publicKeyNoCoord,
  availableUTXOs,
  paramWithCtx,
  showError,
  defaultFeeRate,
  minFeeRate,
}: TStakingFormProps) => {
  const {
    finalityProvider,
    stakingAmountSat,
    stakingTimeBlocks,
    selectedFeeRate,
    setSelectedFeeRate,
    mempoolFeeRates,
  } = useStakingContext();

  const stakingFeeSat = useMemo(() => {
    if (
      btcWalletNetwork &&
      address &&
      publicKeyNoCoord &&
      stakingAmountSat &&
      finalityProvider &&
      paramWithCtx?.currentVersion &&
      mempoolFeeRates &&
      availableUTXOs
    ) {
      try {
        // check that selected Fee rate (if present) is bigger than the min fee
        if (selectedFeeRate && selectedFeeRate < minFeeRate) {
          throw new Error("Selected fee rate is lower than the hour fee");
        }
        const memoizedFeeRate = selectedFeeRate || defaultFeeRate;
        // Calculate the staking fee
        const { stakingFeeSat } = createStakingTx(
          paramWithCtx.currentVersion,
          stakingAmountSat,
          stakingTimeBlocks,
          finalityProvider.btcPk,
          btcWalletNetwork,
          address,
          publicKeyNoCoord,
          memoizedFeeRate,
          availableUTXOs,
        );
        return stakingFeeSat;
      } catch (error: Error | any) {
        let errorMsg = error?.message;
        // Turn the error message into a user-friendly message
        if (errorMsg.includes("Insufficient funds")) {
          errorMsg =
            "Not enough balance to cover staking amount and fees, please lower the staking amount";
        }
        showError({
          error: {
            message: errorMsg,
            errorState: ErrorState.STAKING,
          },
          retryAction: () => setSelectedFeeRate(0),
        });
        setSelectedFeeRate(0);
        return 0;
      }
    } else {
      return 0;
    }
  }, [
    btcWalletNetwork,
    address,
    publicKeyNoCoord,
    stakingAmountSat,
    stakingTimeBlocks,
    finalityProvider,
    paramWithCtx,
    mempoolFeeRates,
    selectedFeeRate,
    availableUTXOs,
    showError,
    defaultFeeRate,
    minFeeRate,
    setSelectedFeeRate,
  ]);

  return {
    stakingFeeSat,
  };
};
