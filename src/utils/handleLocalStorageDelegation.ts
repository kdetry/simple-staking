import { Transaction } from "bitcoinjs-lib";
import { Dispatch, SetStateAction } from "react";

import { Delegation } from "@/app/types/delegations";
import { FinalityProvider } from "@/app/types/finalityProviders";

import { toLocalStorageDelegation } from "./local_storage/toLocalStorageDelegation";

export type HandleLocalStorageDelegationsProps = {
  setDelegationsLocalStorage: Dispatch<SetStateAction<Delegation[]>>;
  signedTxHex: string;
  stakingTerm: number;
  publicKeyNoCoord: string;
  finalityProvider?: FinalityProvider;
  stakingAmountSat: number;
};

export const handleLocalStorageDelegations = ({
  setDelegationsLocalStorage,
  signedTxHex,
  stakingTerm,
  publicKeyNoCoord,
  finalityProvider,
  stakingAmountSat,
}: HandleLocalStorageDelegationsProps) => {
  const newTxId = Transaction.fromHex(signedTxHex).getId();

  setDelegationsLocalStorage((delegations) => {
    const exists = delegations.some(
      (delegation) => delegation.stakingTxHashHex === newTxId,
    );

    if (!exists) {
      return [
        toLocalStorageDelegation(
          newTxId,
          publicKeyNoCoord,
          finalityProvider?.btcPk || "",
          stakingAmountSat,
          signedTxHex,
          stakingTerm,
        ),
        ...delegations,
      ];
    }

    return delegations;
  });
};
