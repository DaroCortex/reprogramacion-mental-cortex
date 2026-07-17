import { useEffect } from "react";

const APP_ID = "reprogramacion-mental";
const SCRIPT_SRC = "https://support.solutgen.com/widget.js";
const SUPPORT_KEY = import.meta.env.VITE_SUPPORT_INGEST_KEY || "";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.1.0";

const syncObject = (target, source = {}) => {
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, source || {});
};

export function useSolutgenSupportWidget({ enabled, user, context }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const registry = window.__solutgenSupportConfigs || {};
    window.__solutgenSupportConfigs = registry;
    const liveConfig = registry[APP_ID] || {
      context: {},
      initialized: false,
      initializing: false,
      user: {}
    };
    registry[APP_ID] = liveConfig;
    syncObject(liveConfig.user, user);
    syncObject(liveConfig.context, context);

    if (!enabled || !SUPPORT_KEY || liveConfig.initialized || liveConfig.initializing) return;

    const init = () => {
      liveConfig.initializing = false;
      if (!window.SolutgenSupport || liveConfig.initialized) return;
      window.SolutgenSupport.init({
        appId: APP_ID,
        appName: "Reprogramación Mental",
        key: SUPPORT_KEY,
        user: liveConfig.user,
        version: APP_VERSION,
        context: liveConfig.context
      });
      liveConfig.initialized = true;
    };

    liveConfig.initializing = true;
    const existing = document.querySelector("script[data-solutgen-support]");
    if (window.SolutgenSupport) {
      init();
      return;
    }
    if (existing) {
      existing.addEventListener("load", init, { once: true });
      existing.addEventListener("error", () => {
        liveConfig.initializing = false;
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.dataset.solutgenSupport = "true";
    script.addEventListener("load", init, { once: true });
    script.addEventListener("error", () => {
      liveConfig.initializing = false;
    }, { once: true });
    document.body.appendChild(script);
  }, [enabled, user, context]);
}
