"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Default to true for SSR safety, preventing animation mismatch
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={isDesktop ? undefined : { opacity: 0, scale: 0.98, filter: "blur(6px)" }}
        animate={isDesktop ? undefined : { opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={isDesktop ? undefined : { opacity: 0, scale: 0.98, filter: "blur(6px)" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => {
          if (!isDesktop) {
            setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
          }
        }}
        className="w-full h-full flex flex-col flex-1 relative md:w-full md:h-full md:flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
