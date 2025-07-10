import { useState, useEffect, useRef } from 'react';

function easeOut(t: number) {
    return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(end: number, duration = 1500) {
    const [count, setCount] = useState(0);
    const frameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const elapsedTime = timestamp - startTimeRef.current;
            const progress = Math.min(elapsedTime / duration, 1);
            const easedProgress = easeOut(progress);

            const currentCount = Math.round(easedProgress * end);
            setCount(currentCount);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
            startTimeRef.current = null;
        };
    }, [end, duration]);

    return count;
}