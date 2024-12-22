import { useQuery, useQueryClient } from "@tanstack/react-query";
import { networks } from "bitcoinjs-lib";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";

import { UTXO_KEY } from "@/app/common/constants";
import { useFeedbackModal } from "@/app/hooks/useFeedbackModal";
import {
  useStakingOverflow,
  UseStakingOverflowReturn,
} from "@/app/hooks/useStakingOverflow";
import { Delegation } from "@/app/types/delegations";
import { ErrorState } from "@/app/types/errors";
import { FinalityProvider } from "@/app/types/finalityProviders";
import {
  createStakingTx,
  signStakingTx,
} from "@/utils/delegations/signStakingTx";
import { getFeeRateFromMempool } from "@/utils/getFeeRateFromMempool";
import { handleLocalStorageDelegations } from "@/utils/handleLocalStorageDelegation";
import { Fees, UTXO, WalletProvider } from "@/utils/wallet/wallet_provider";

import { useError } from "../Error/ErrorContext";

interface StakingContextType {
  // Wallet
  btcWallet?: WalletProvider;
  btcWalletBalanceSat?: number;
  btcWalletNetwork: networks.Network;
  address: string;
  publicKeyNoCoord: string;
  btcHeight: number | undefined;
  availableUTXOs?: UTXO[];
  stakingFeeSat: number;
  overflow: UseStakingOverflowReturn["overflow"];
  paramWithCtx: UseStakingOverflowReturn["paramWithCtx"];
  // State
  finalityProvider?: FinalityProvider;
  finalityProviders?: FinalityProvider[];
  stakingAmountSat: number;
  stakingTimeBlocks: number;
  selectedFeeRate: number;
  awaitingWalletResponse: boolean;
  previewModalOpen: boolean;
  mempoolFeeRates?: Fees;
  mempoolFeeRatesError?: Error;
  hasMempoolFeeRatesError: boolean;
  formResetTrigger: boolean;
  refetchMempoolFeeRates: () => void;
  // Setters
  setFinalityProvider: Dispatch<SetStateAction<FinalityProvider | undefined>>;
  setFinalityProviders: Dispatch<
    SetStateAction<FinalityProvider[] | undefined>
  >;
  setStakingAmountSat: (amount: number) => void;
  setStakingTimeBlocks: (blocks: number) => void;
  setSelectedFeeRate: (rate: number) => void;
  setAwaitingWalletResponse: (waiting: boolean) => void;
  setPreviewModalOpen: (open: boolean) => void;

  // Methods
  resetForm: () => void;
  resetFormInputs: () => void;
  handleSign: () => Promise<void>;
}

const StakingContext = createContext<StakingContextType | undefined>(undefined);

interface StakingProviderProps {
  children: ReactNode;
  btcHeight: number | undefined;
  btcWallet: WalletProvider | undefined;
  btcWalletBalanceSat?: number;
  btcWalletNetwork: networks.Network | undefined;
  address: string | undefined;
  publicKeyNoCoord: string;
  setDelegationsLocalStorage: Dispatch<SetStateAction<Delegation[]>>;
  availableUTXOs?: UTXO[] | undefined;
}

export const StakingProvider = ({
  children,
  btcHeight,
  btcWallet,
  btcWalletBalanceSat,
  btcWalletNetwork,
  address,
  publicKeyNoCoord,
  setDelegationsLocalStorage,
  availableUTXOs,
}: StakingProviderProps) => {
  const { showError, isErrorOpen } = useError();

  const { overflow, paramWithCtx } = useStakingOverflow(btcHeight);
  const { feedbackModal, handleFeedbackModal, handleCloseFeedbackModal } =
    useFeedbackModal();

  const queryClient = useQueryClient();

  // State
  const [finalityProvider, setFinalityProvider] = useState<FinalityProvider>();
  const [finalityProviders, setFinalityProviders] =
    useState<FinalityProvider[]>();
  const [stakingAmountSat, setStakingAmountSat] = useState(0);
  const [stakingTimeBlocks, setStakingTimeBlocks] = useState(0);
  const [selectedFeeRate, setSelectedFeeRate] = useState(0);
  const [awaitingWalletResponse, setAwaitingWalletResponse] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [formResetTrigger, setFormResetTrigger] = useState(false);

  // Queries
  const {
    data: mempoolFeeRates,
    error: mempoolFeeRatesError,
    isError: hasMempoolFeeRatesError,
    refetch: refetchMempoolFeeRates,
  } = useQuery({
    queryKey: ["mempool fee rates"],
    queryFn: async () => {
      if (btcWallet?.getNetworkFees) {
        return await btcWallet.getNetworkFees();
      }
    },
    enabled: !!btcWallet?.getNetworkFees,
    refetchInterval: 60000,
    retry: (failureCount) => !isErrorOpen && failureCount <= 3,
  });

  const resetFormInputs = () => {
    setStakingAmountSat(0);
    setStakingTimeBlocks(0);
    setSelectedFeeRate(0);
  };

  const resetForm = () => {
    resetFormInputs();
    setFinalityProvider(undefined);
    setPreviewModalOpen(false);
    setFormResetTrigger(true);
  };

  const { minFeeRate, defaultFeeRate } = getFeeRateFromMempool(mempoolFeeRates);

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

  const handleSign = async () => {
    try {
      setAwaitingWalletResponse(true);

      // Validation
      if (!btcWallet) throw new Error("Wallet is not connected");
      if (!address) throw new Error("Address is not set");
      if (!btcWalletNetwork) throw new Error("Wallet network is not connected");
      if (!finalityProvider)
        throw new Error("Finality provider is not selected");
      if (!paramWithCtx?.currentVersion)
        throw new Error("Global params not loaded");
      if (!selectedFeeRate) throw new Error("Fee rates not loaded");
      if (!availableUTXOs || availableUTXOs.length === 0)
        throw new Error("No available balance");

      const { currentVersion: globalParamsVersion } = paramWithCtx;

      // Sign transaction
      const { stakingTxHex, stakingTerm } = await signStakingTx(
        btcWallet,
        globalParamsVersion,
        stakingAmountSat,
        stakingTimeBlocks,
        finalityProvider.btcPk,
        btcWalletNetwork,
        address,
        publicKeyNoCoord,
        selectedFeeRate,
        availableUTXOs,
      );

      // Update state
      queryClient.invalidateQueries({ queryKey: [UTXO_KEY, address] });
      handleFeedbackModal("success");
      handleLocalStorageDelegations({
        setDelegationsLocalStorage,
        signedTxHex: stakingTxHex,
        stakingTerm,
        publicKeyNoCoord,
        finalityProvider,
        stakingAmountSat,
      });
      resetForm();
    } catch (error: any) {
      showError({
        error: {
          message: error.message,
          errorState: ErrorState.STAKING,
        },
        noCancel: true,
        retryAction: () => {
          setStakingAmountSat(0);
          setSelectedFeeRate(0);
          setPreviewModalOpen(false);
          resetForm();
          queryClient.invalidateQueries({ queryKey: [UTXO_KEY, address] });
        },
      });
    } finally {
      setAwaitingWalletResponse(false);
    }
  };

  const value = {
    btcWallet,
    btcWalletBalanceSat,
    btcWalletNetwork,
    address,
    publicKeyNoCoord,
    btcHeight,
    availableUTXOs,
    overflow,
    paramWithCtx,
    finalityProvider,
    finalityProviders,
    stakingAmountSat,
    stakingTimeBlocks,
    selectedFeeRate,
    awaitingWalletResponse,
    previewModalOpen,
    mempoolFeeRates,
    mempoolFeeRatesError,
    hasMempoolFeeRatesError,
    stakingFeeSat,
    formResetTrigger,
    refetchMempoolFeeRates,
    setFinalityProvider,
    setFinalityProviders,
    setStakingAmountSat,
    setStakingTimeBlocks,
    setSelectedFeeRate,
    setAwaitingWalletResponse,
    setPreviewModalOpen,
    resetForm,
    resetFormInputs,
    handleSign,
  };

  return (
    <StakingContext.Provider value={value}>{children}</StakingContext.Provider>
  );
};

export const useStakingContext = () => {
  const context = useContext(StakingContext);
  if (context === undefined) {
    throw new Error("useStaking must be used within a StakingProvider");
  }
  return context;
};
