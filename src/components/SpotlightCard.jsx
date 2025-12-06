import React, { useRef, useState } from 'react';

const SpotlightCard = ({ children, className = "", spotlightColor = "rgba(255, 255, 255, 0.25)", ...props }) => {
    const divRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    // Get position from event (works for both mouse and touch)
    const getEventPosition = (e) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();

        // Handle touch events
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            setPosition({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
        }
        // Handle mouse events
        else if (e.clientX !== undefined) {
            setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    // Mouse events
    const handleMouseMove = (e) => getEventPosition(e);
    const handleMouseEnter = () => setOpacity(1);
    const handleMouseLeave = () => setOpacity(0);

    // Touch events
    const handleTouchStart = (e) => {
        setOpacity(1);
        getEventPosition(e);
    };
    const handleTouchMove = (e) => getEventPosition(e);
    const handleTouchEnd = () => {
        // Keep the spotlight visible briefly after touch ends
        setTimeout(() => setOpacity(0), 300);
    };

    return (
        <div
            ref={divRef}
            // Mouse events
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            // Touch events
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 ${className}`}
            style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
            }}
            {...props}
        >
            {/* Spotlight Effect Layer */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
                }}
            />
            {/* Content */}
            <div className="relative h-full">
                {children}
            </div>
        </div>
    );
};

export default SpotlightCard;
