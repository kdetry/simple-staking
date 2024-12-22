import { getNetworkConfig } from "@/config/network.config";

interface WalletNotConnectedProps {
  onConnect: () => void;
}

export const WalletNotConnected: React.FC<WalletNotConnectedProps> = ({
  onConnect,
}) => {
  const { networkName } = getNetworkConfig();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <p className="text-center">
        Connect your wallet to start staking on {networkName} network
      </p>
      <button className="btn-primary btn" onClick={onConnect}>
        Connect Wallet
      </button>
    </div>
  );
};
