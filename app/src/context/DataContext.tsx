import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { IDataProvider } from "../adapters/IDataProvider";
import { localDataProvider } from "../adapters/LocalDataProvider";
import type { DataBundle } from "../types/domain";

interface DataContextValue {
  provider: IDataProvider;
  loading: boolean;
  error: string | null;
  site: DataBundle["site"] | null;
  areas: DataBundle["areas"];
  assets: DataBundle["assets"];
  equipment: DataBundle["equipment"];
  batches: DataBundle["batches"];
  signals: DataBundle["signals"];
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [site, setSite] = useState<DataBundle["site"] | null>(null);
  const [areas, setAreas] = useState<DataBundle["areas"]>([]);
  const [assets, setAssets] = useState<DataBundle["assets"]>([]);
  const [equipment, setEquipment] = useState<DataBundle["equipment"]>([]);
  const [batches, setBatches] = useState<DataBundle["batches"]>([]);
  const [signals, setSignals] = useState<DataBundle["signals"]>([]);

  useEffect(() => {
    async function init() {
      try {
        await localDataProvider.initialize();
        const [assetsData, equipmentData, batchesData, signalsData] =
          await Promise.all([
            localDataProvider.listAssets(),
            localDataProvider.listEquipment(),
            localDataProvider.listBatches(),
            localDataProvider.getSignals(),
          ]);

        const res = await fetch("/data/generated/site.json");
        const siteData = (await res.json()) as DataBundle["site"];
        const areasRes = await fetch("/data/generated/areas.json");
        const areasData = (await areasRes.json()) as DataBundle["areas"];

        setSite(siteData);
        setAreas(areasData);
        setAssets(assetsData);
        setEquipment(equipmentData);
        setBatches(batchesData);
        setSignals(signalsData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <DataContext.Provider
      value={{
        provider: localDataProvider,
        loading,
        error,
        site,
        areas,
        assets,
        equipment,
        batches,
        signals,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
