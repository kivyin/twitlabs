import { useEffect, useState } from "react";
import {
  ensureForeignKeyLabelMaps,
  getCachedForeignKeyLabelMap,
} from "../utils/foreignKeyLabels";

/** @deprecated Prefer useForeignKeyLabelMaps for full FK resolution. */
export function useUserLabelMap() {
  const [userLabelMap, setUserLabelMap] = useState(
    () => getCachedForeignKeyLabelMap("users") ?? {}
  );

  useEffect(() => {
    let active = true;

    ensureForeignKeyLabelMaps(["users"])
      .then((maps) => {
        if (active) {
          setUserLabelMap(maps.users ?? {});
        }
      })
      .catch(() => {
        if (active) {
          setUserLabelMap({});
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return userLabelMap;
}
