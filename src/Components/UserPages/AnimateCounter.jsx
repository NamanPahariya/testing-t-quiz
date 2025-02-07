import React, { useEffect, useRef, useState } from "react";

export const AnimatedCounter = ({ finalValue }) => {
  const [count, setCount] = useState(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const hasAnimated = useRef(false);
  
  // Determine the number of decimal places in finalValue
  const getDecimalPlaces = (num) => {
    const match = String(num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return 0;
    return Math.max(
      0,
      // Number of digits right of decimal point.
      (match[1] ? match[1].length : 0)
    );
  };
  
  const decimalPlaces = getDecimalPlaces(finalValue);
  
  useEffect(() => {
    // Only run animation once
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    
    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        setCount(0);
      }
      
      const runtime = timestamp - startTimeRef.current;
      const duration = 1000;
      const progress = Math.min(runtime / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = easeProgress * finalValue;
      
      // Ensure we're not exceeding the precision of the final value
      setCount(Number(currentValue.toFixed(decimalPlaces)));
      
      if (runtime < duration) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at the final value
        setCount(finalValue);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [finalValue, decimalPlaces]);
  
  return (
    <span>
      {count === null ? finalValue : count}
    </span>
  );
};

export default AnimatedCounter;