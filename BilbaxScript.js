"use client";
import { useEffect } from "react";

export default function BilbaxScript() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/bilbax.js";
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  return null;
}
