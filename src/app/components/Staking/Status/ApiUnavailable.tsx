// src/app/components/Staking/components/Status/ApiUnavailable.tsx
import { Message } from "../Form/States/Message";
import apiNotAvailable from "../Form/States/api-not-available.svg";

interface ApiUnavailableProps {
  message: string;
}

export const ApiUnavailable: React.FC<ApiUnavailableProps> = ({ message }) => {
  return (
    <Message
      title="Staking is not available"
      messages={[message]}
      icon={apiNotAvailable}
    />
  );
};
