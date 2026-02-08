import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import cssText from "./daily-goals.css?raw";
import DailyGoalsModuleCore from "./DailyGoalsModuleCore";

export default function DailyGoalsModule(props) {
  const hostRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);

  useEffect(() => {
    if (!hostRef.current || mountNode) return;
    const shadowRoot = hostRef.current.attachShadow({ mode: "open" });

    const styleEl = document.createElement("style");
    styleEl.textContent = cssText;
    shadowRoot.appendChild(styleEl);

    const container = document.createElement("div");
    shadowRoot.appendChild(container);
    setMountNode(container);
  }, [mountNode]);

  return (
    <div ref={hostRef}>
      {mountNode ? createPortal(<DailyGoalsModuleCore {...props} />, mountNode) : null}
    </div>
  );
}
