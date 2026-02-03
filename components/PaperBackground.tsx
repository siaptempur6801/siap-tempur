import React from 'react';

export default function PaperBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none z-[-1] opacity-30"
            style={{
                backgroundImage: "repeating-linear-gradient(transparent, transparent 1.9rem, #9ca3af 2rem)",
                backgroundSize: "100% 2rem",
                marginTop: "2rem"
            }}>
            {/* Garis Margin Merah Kiri */}
            <div className="absolute left-8 md:left-24 top-0 bottom-0 w-[2px] bg-red-300/50"></div>
        </div>
    );
}
