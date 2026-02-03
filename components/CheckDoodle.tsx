import React from 'react';

export default function CheckDoodle({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${className} text-green-600 shrink-0`}
        >
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
}
