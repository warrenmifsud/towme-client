import { type ReactNode } from 'react';

interface PageContainerProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * PageContainer - Global Layout Wrapper
 * 
 * Enforces uniform structure across all admin portal tabs.
 * Provides automatic glass styling, consistent spacing, and theme integration.
 * 
 * Usage:
 * ```tsx
 * <PageContainer title="Partners" subtitle="Manage vendors">
 *   {content}
 * </PageContainer>
 * ```
 */
export default function PageContainer({
    title,
    subtitle,
    actions,
    children,
    className = ''
}: PageContainerProps) {
    return (
        <div className={`page-spacing ${className}`}>
            {/* Standard Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-heading-xl">{title}</h1>
                    {subtitle && (
                        <p className="text-body mt-1">{subtitle}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-3">
                        {actions}
                    </div>
                )}
            </header>

            {/* Page Content */}
            <div className="section-spacing">
                {children}
            </div>
        </div>
    );
}
