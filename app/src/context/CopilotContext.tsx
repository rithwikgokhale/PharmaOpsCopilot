import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface CopilotRequestSignal {
  question: string;
  nonce: number;
}

interface CopilotContextValue {
  pending: CopilotRequestSignal | null;
  /** Push a question to the active CopilotPanel (e.g. from a chart or timeline click). */
  ask: (question: string) => void;
}

const CopilotContext = createContext<CopilotContextValue | null>(null);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<CopilotRequestSignal | null>(null);

  const ask = useCallback((question: string) => {
    setPending({ question, nonce: Date.now() });
  }, []);

  return (
    <CopilotContext.Provider value={{ pending, ask }}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilotBus() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilotBus must be used within CopilotProvider");
  return ctx;
}
