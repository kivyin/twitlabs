import { useEffect, useState } from "react";
import { fetchHomeInventoryItemImageUrl } from "../../api/homeInventoryApi";

function HomeInventoryItemThumb({ item, className = "" }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    async function load() {
      if (!item?.image_path) {
        setUrl("");
        return;
      }
      const next = await fetchHomeInventoryItemImageUrl(item.id);
      if (!active) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      objectUrl = next;
      setUrl(next);
    }
    load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item?.id, item?.image_path]);

  if (!url) {
    return (
      <div
        className={`home-inv-thumb home-inv-thumb--empty${className ? ` ${className}` : ""}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`home-inv-thumb${className ? ` ${className}` : ""}`}>
      <img src={url} alt="" />
    </div>
  );
}

export default HomeInventoryItemThumb;
