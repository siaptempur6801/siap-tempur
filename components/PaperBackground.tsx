import React from 'react';

interface PaperBackgroundProps {
    variant?: 'default' | 'light'
}

export default function PaperBackground({ variant = 'default' }: PaperBackgroundProps) {
    const isLight = variant === 'light'
    return (
        <div className={`absolute inset-0 pointer-events-none z-0 ${isLight ? 'opacity-30' : 'opacity-60'}`}
            style={{
                backgroundImage: isLight
                    ? "repeating-linear-gradient(transparent, transparent 1.9rem, #9ca3af 2rem)"
                    : "repeating-linear-gradient(transparent, transparent 31px, #94a3b8 32px)",
                backgroundSize: isLight ? "100% 2rem" : "100% 32px",
                marginTop: isLight ? "2rem" : "0.5rem"
            }}>
            <div className={`absolute left-8 md:left-24 top-0 bottom-0 w-[2px] ${isLight ? 'bg-red-300/50' : 'bg-red-500/30'}`}></div>
        </div>
    );
}
