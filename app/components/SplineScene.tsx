"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface SplineSceneProps {
  sceneUrl?: string | null;
  fallback: ReactNode;
  className?: string;
  onLoad?: (app: unknown) => void;
}

export default function SplineScene({
  sceneUrl,
  fallback,
  className = "",
  onLoad,
}: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [SplineComponent, setSplineComponent] = useState<React.ComponentType<{
    scene: string;
    onLoad?: (app: unknown) => void;
    style?: React.CSSProperties;
  }> | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!sceneUrl || isMobile) return;
    import("@splinetool/react-spline")
      .then((mod) => {
        setSplineComponent(() => mod.default);
      })
      .catch(() => {
        setHasError(true);
      });
  }, [sceneUrl, isMobile]);

  if (!sceneUrl || isMobile || hasError) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div ref={containerRef} className={`${className} relative`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50">
          <div className="spline-loader" />
        </div>
      )}
      {SplineComponent && (
        <SplineComponent
          scene={sceneUrl}
          onLoad={(app: unknown) => {
            setIsLoaded(true);
            onLoad?.(app);
          }}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
