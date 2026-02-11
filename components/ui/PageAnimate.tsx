'use client'

import React from 'react'
import { motion, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PageAnimateProps {
    children: React.ReactNode
    className?: string
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1
        }
    }
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15, rotate: -0.5 },
    visible: {
        opacity: 1,
        y: 0,
        rotate: 0,
        transition: {
            type: 'spring',
            stiffness: 100,
            damping: 15
        }
    }
}

export function PageAnimateContainer({ children, className }: PageAnimateProps) {
    return (
        <motion.div
            className={cn("w-full", className)}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {children}
        </motion.div>
    )
}

export function PageAnimateItem({ children, className }: PageAnimateProps) {
    return (
        <motion.div variants={itemVariants} className={className}>
            {children}
        </motion.div>
    )
}
