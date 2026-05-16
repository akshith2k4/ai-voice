import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDcid, setDcid as setDcidStore, initDcid } from "../state/dcidStore";

const DcidContext = createContext({
  dcid: null,
  setDcid: () => {},
  requireWarehouse: false,
  setRequireWarehouse: () => {},
});
export function DcidProvider({ children }) {
  const [dcid, setDcidState] = useState(initDcid());
  const [requireWarehouse, setRequireWarehouse] = useState(false);
  const setDcid = (val) => {
    const v = setDcidStore(val);
    setDcidState(v);
    if (v) setRequireWarehouse(false);
  };

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "linengrass_dcid") {
        setDcidState(getDcid());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ dcid, setDcid, requireWarehouse, setRequireWarehouse }),
    [dcid, requireWarehouse]
  );
  return <DcidContext.Provider value={value}>{children}</DcidContext.Provider>;
}

export function useDcid() {
  return useContext(DcidContext);
}
