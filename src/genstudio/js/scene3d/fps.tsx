import React, {useRef, useCallback} from "react"

interface FPSCounterProps {
    fpsRef: React.RefObject<HTMLDivElement>;
}
export function FPSCounter({ fpsRef }: FPSCounterProps) {
    return (
        <div
            ref={fpsRef}
            style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '5px',
                borderRadius: '3px',
                fontSize: '14px'
            }}
        >
            0 FPS
        </div>
    );
}

export function useFPSCounter() {
    const fpsDisplayRef = useRef<HTMLDivElement>(null);
    const frameTimesRef = useRef<number[]>([]);
    const lastFrameTimeRef = useRef<number>(0);
    const lastDisplayUpdateRef = useRef<number>(0);
    const MAX_SAMPLES = 8;
    const DISPLAY_UPDATE_INTERVAL = 500; // Update display every 1000ms (1 second)

    const updateDisplay = useCallback((timestamp: number) => {
        // Initialize on first frame
        if (lastFrameTimeRef.current === 0) {
            lastFrameTimeRef.current = timestamp;
            lastDisplayUpdateRef.current = timestamp;
            return;
        }

        // Calculate frame time in milliseconds
        const frameTime = timestamp - lastFrameTimeRef.current;
        lastFrameTimeRef.current = timestamp;

        // Add to rolling average
        frameTimesRef.current.push(frameTime);
        if (frameTimesRef.current.length > MAX_SAMPLES) {
            frameTimesRef.current.shift();
        }

        // Calculate average FPS
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) /
            frameTimesRef.current.length;
        const fps = 1000 / avgFrameTime;

        // Update display at most once per second
        if (timestamp - lastDisplayUpdateRef.current >= DISPLAY_UPDATE_INTERVAL) {
            if (fpsDisplayRef.current) {
                fpsDisplayRef.current.textContent = `${Math.round(fps)} FPS`;
            }
            lastDisplayUpdateRef.current = timestamp;
        }
    }, []);

    return { fpsDisplayRef, updateDisplay };
}
