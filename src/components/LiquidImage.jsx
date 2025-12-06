import React, { useRef, useState, useEffect, useMemo } from 'react';

// Generate a simple unique ID
let idCounter = 0;
const generateId = () => `liquid-${++idCounter}`;

const LiquidImage = ({ src, alt, className = "" }) => {
    const filterId = useMemo(() => generateId(), []);
    const [isHovering, setIsHovering] = useState(false);
    const turbRef = useRef(null);
    const animationRef = useRef(null);
    const currentFreqRef = useRef(0);

    // Smooth animation loop
    useEffect(() => {
        const targetFreq = isHovering ? 0.025 : 0;

        const animate = () => {
            currentFreqRef.current += (targetFreq - currentFreqRef.current) * 0.08;

            if (turbRef.current) {
                const freq = currentFreqRef.current;
                turbRef.current.setAttribute('baseFrequency', `${freq} ${freq}`);
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isHovering]);

    return (
        <div
            className={`relative ${className}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{ overflow: 'hidden' }}
        >
            {/* SVG Filter Definition */}
            <svg
                style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
                aria-hidden="true"
            >
                <defs>
                    <filter id={filterId}>
                        <feTurbulence
                            ref={turbRef}
                            type="fractalNoise"
                            baseFrequency="0"
                            numOctaves="3"
                            result="noise"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale="60"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            {/* Image with filter applied */}
            <img
                src={src}
                alt={alt}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: `url(#${filterId})`,
                    transform: isHovering ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
            />
        </div>
    );
};

export default LiquidImage;
