import React from 'react';

export default function PaperBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 opacity-60"
            style={{
                backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #94a3b8 32px)",
                backgroundSize: "100% 32px",
                marginTop: "0.5rem"
            }}>
            {/* Garis Margin Merah Kiri */}
            <div className="absolute left-8 md:left-24 top-0 bottom-0 w-[2px] bg-red-500/30"></div>
        </div>
    );
}
