import { networks } from "bitcoinjs-lib";
import { Dispatch, SetStateAction, useEffect } from "react";

import { FinalityProviders } from "@/app/components/Staking/FinalityProviders/FinalityProviders";
import { useError } from "@/app/context/Error/ErrorContext";
import { useStakingContext } from "@/app/context/Staking/StakingContext";
import { useFeedbackModal } from "@/app/hooks/useFeedbackModal";
import { Delegation } from "@/app/types/delegations";
import { ErrorState } from "@/app/types/errors";
import { UTXO, WalletProvider } from "@/utils/wallet/wallet_provider";

import { FeedbackModal } from "../Modals/FeedbackModal";

import { StakingForm } from "./Form/StakingForm";
export interface StakingProps {
  btcHeight: number | undefined;
  isWalletConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  btcWallet: WalletProvider | undefined;
  btcWalletBalanceSat?: number;
  btcWalletNetwork: networks.Network | undefined;
  address: string | undefined;
  publicKeyNoCoord: string;
  setDelegationsLocalStorage: Dispatch<SetStateAction<Delegation[]>>;
  availableUTXOs?: UTXO[] | undefined;
}

export const Staking: React.FC<StakingProps> = ({
  isWalletConnected,
  onConnect,
  isLoading,
}) => {
  const { showError } = useError();

  const {
    publicKeyNoCoord,
    finalityProvider,
    finalityProviders,
    mempoolFeeRatesError,
    hasMempoolFeeRatesError,
    refetchMempoolFeeRates,
    setFinalityProvider,
    setFinalityProviders,
    setPreviewModalOpen,
  } = useStakingContext();

  // Feedback modal state
  const { feedbackModal, handleFeedbackModal, handleCloseFeedbackModal } =
    useFeedbackModal();

  // Error effect
  useEffect(() => {
    if (mempoolFeeRatesError && hasMempoolFeeRatesError) {
      showError({
        error: {
          message: mempoolFeeRatesError.message,
          errorState: ErrorState.SERVER_ERROR,
        },
        retryAction: refetchMempoolFeeRates,
      });
    }
  }, [
    mempoolFeeRatesError,
    hasMempoolFeeRatesError,
    showError,
    refetchMempoolFeeRates,
  ]);

  // Handlers
  const handleChooseFinalityProvider = (btcPkHex: string) => {
    const found = finalityProviders?.find((fp) => fp.btcPk === btcPkHex);

    if (!found) {
      showError({
        error: {
          message: "Finality provider not found",
          errorState: ErrorState.STAKING,
        },
      });
      return;
    }

    if (found.btcPk === publicKeyNoCoord) {
      showError({
        error: {
          message:
            "Cannot select a finality provider with the same public key as the wallet",
          errorState: ErrorState.STAKING,
        },
      });
      return;
    }

    setFinalityProvider(found);
  };

  const handlePreviewModalClose = (isOpen: boolean) => {
    setPreviewModalOpen(isOpen);
    handleFeedbackModal("cancel");
  };

  return (
    <div className="card flex flex-col gap-2 bg-base-300 p-4 shadow-sm lg:flex-1">
      <h3 className="mb-4 font-bold">Staking</h3>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4 lg:basis-3/5 xl:basis-2/3">
          <FinalityProviders
            onFinalityProvidersLoad={setFinalityProviders}
            selectedFinalityProvider={finalityProvider}
            onFinalityProviderChange={handleChooseFinalityProvider}
          />
        </div>
        <div className="divider m-0 lg:divider-horizontal lg:m-0" />
        <div className="flex flex-1 flex-col gap-4 lg:basis-2/5 xl:basis-1/3">
          <StakingForm
            isWalletConnected={isWalletConnected}
            onConnect={onConnect}
            isLoading={isLoading}
          />
        </div>
      </div>
      <FeedbackModal
        open={feedbackModal.isOpen}
        onClose={handleCloseFeedbackModal}
        type={feedbackModal.type}
      />
    </div>
  );
};
