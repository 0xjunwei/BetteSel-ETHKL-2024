interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (result: unknown) => void) => void;
      removeListener: (event: string, callback: (result: unknown) => void) => void;
      isMetaMask?: boolean;
    };
  }