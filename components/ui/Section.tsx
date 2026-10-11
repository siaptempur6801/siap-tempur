import * as React from 'react'
import { cn } from '@/lib/utils'
import PaperBackground from '@/components/PaperBackground'

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  dashedBorder?: 'top' | 'bottom' | 'both' | 'none'
  pattern?: 'grid' | 'dots' | 'none'
  paper?: boolean
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    { className, dashedBorder = 'none', pattern = 'none', paper = false, children, ...props },
    ref,
  ) => {
    const borderStyles = {
      top: 'border-t-4 border-gray-900 border-dashed',
      bottom: 'border-b-4 border-gray-900 border-dashed',
      both: 'border-y-4 border-gray-900 border-dashed',
      none: '',
    }

    const patterns = {
      grid: {
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      },
      dots: {
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
        backgroundSize: '15px 15px',
      },
      none: {},
    }

    return (
      <section
        ref={ref}
        className={cn('relative py-24 overflow-hidden', borderStyles[dashedBorder], className)}
        {...props}
      >
        {paper && <PaperBackground />}

        {pattern !== 'none' && (
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={patterns[pattern]}
          />
        )}

        <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">{children}</div>
      </section>
    )
  },
)

Section.displayName = 'Section'

export { Section }
