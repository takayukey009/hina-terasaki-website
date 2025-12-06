import React, { useEffect, useRef, useState } from 'react';

const VelocityText = ({ children, className = "" }) => {
    const [skew, setSkew] = useState(0);
    const lastScrollY = useRef(0);
    const currentSkew = useRef(0);
    const animationRef = useRef(null);

    useEffect(() => {
        let targetSkew = 0;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const velocity = currentScrollY - lastScrollY.current;

            // Calculate target skew based on velocity (-15 to 15 degrees)
            targetSkew = Math.min(Math.max(velocity * 0.3, -15), 15);
            lastScrollY.current = currentScrollY;
        };

        const animate = () => {
            // Smoothly interpolate towards target
            currentSkew.current += (targetSkew - currentSkew.current) * 0.1;

            // Decay the target back to 0 when not scrolling
            targetSkew *= 0.95;

            setSkew(currentSkew.current);
            animationRef.current = requestAnimationFrame(animate);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <span
            className={className}
            style={{
                display: 'inline-block',
                transform: `skewX(${skew}deg)`,
                willChange: 'transform',
                transition: 'transform 0.05s linear',
            }}
        >
            {children}
        </span>
    );
};

export default VelocityText;
