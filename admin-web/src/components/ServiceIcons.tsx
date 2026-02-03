import type { LucideProps } from 'lucide-react';

// HELPER: Image (True Transparent - No Blend Mode needed)
const IconImage = ({ className = "", src, flip = false }: LucideProps & { src: string, flip?: boolean }) => {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
                src={src}
                alt="icon"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    // mixBlendMode removed - using true transparent PNGs
                    transform: flip ? 'scaleX(-1)' : 'none'
                }}
                className={className}
            />
        </div>
    );
};

// HELPER: SVG Container
const IconSVG = ({ size = 32, className = "", children, ...props }: LucideProps & { children: React.ReactNode }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 64 48"
        fill="none"
        className={className}
        {...props}
    >
        {children}
    </svg>
);

const C = {
    body: "#F8FAFC",       // White
    bodyDark: "#E2E8F0",   // Subtle Shadow
    window: "#475569",     // Slate Window
    tire: "#1E293B",       // Black
    hubcap: "#94A3B8"      // Silver
};

// 1. CAR (True Transparent 3D Image + Flip Right)
export const CarIcon = (props: LucideProps) => (
    <IconImage src="/icons/car_transparent.png" flip={true} {...props} />
);

// 2. SUV (True Transparent 3D Image + Flip Right)
export const SuvIcon = (props: LucideProps) => (
    <IconImage src="/icons/suv_transparent.png" flip={true} {...props} />
);

// 3. MOTORCYCLE (True Transparent 3D Image)
export const MotorcycleIcon = (props: LucideProps) => (
    <IconImage src="/icons/motorcycle_transparent.png" {...props} />
);

// 4. VAN (Solid Vector Medium Van - Transit/Transporter Style)
export const VanIcon = (props: LucideProps) => (
    <IconImage src="/icons/van.webp" {...props} />
);

export const MediumVanIcon = (props: LucideProps) => (
    <IconImage src="/icons/medium_van.webp" {...props} />
);

// 5. BOX TRUCK (Smooth SVG)
// 5. BOX TRUCK (True Transparent 3D Image)
export const BoxVanIcon = (props: LucideProps) => (
    <IconImage src="/icons/box_van.webp" {...props} />
);

// 6. LUTON VAN (Smooth SVG)
export const LutonVanIcon = (props: LucideProps) => (
    <IconSVG {...props}>
        <ellipse cx="32" cy="40" rx="26" ry="3" fill="black" opacity="0.2" />
        <circle cx="18" cy="36" r="6" fill={C.tire} />
        <circle cx="18" cy="36" r="2.5" fill={C.hubcap} />
        <circle cx="50" cy="36" r="6" fill={C.tire} />
        <circle cx="50" cy="36" r="2.5" fill={C.hubcap} />
        <path d="M42 36 V24 C42 20 44 16 48 16 H54 C58 16 60 20 60 26 V36 H42 Z" fill={C.body} />
        <path d="M48 18 H54 C56 18 57 20 57 24 H48 V18 Z" fill={C.window} />
        <path d="M4 36 H40 V16 H48 V8 C48 6 46 4 44 4 H8 C6 4 4 6 4 8 V36 Z" fill={C.body} />
    </IconSVG>
);

// 7. GARAGE (Smooth SVG)
export const GarageIcon = (props: LucideProps) => (
    <IconSVG {...props}>
        <path d="M6 38 H58 V16 L32 6 L6 16 V38 Z" fill={C.body} />
        <rect x="22" y="24" width="20" height="14" rx="1" fill={C.bodyDark} />
        <path d="M22 28 H42 M22 32 H42" stroke="#94A3B8" strokeWidth="1" />
    </IconSVG>
);

// 8. VINTAGE CAR (Smooth SVG)
export const VintageCarIcon = (props: LucideProps) => (
    <IconSVG {...props}>
        <ellipse cx="32" cy="40" rx="26" ry="3" fill="black" opacity="0.2" />
        <circle cx="16" cy="36" r="6" fill={C.tire} />
        <circle cx="16" cy="36" r="2.5" fill={C.hubcap} />
        <circle cx="48" cy="36" r="6" fill={C.tire} />
        <circle cx="48" cy="36" r="2.5" fill={C.hubcap} />
        <path d="M4 28 C4 28 10 18 20 18 H44 C54 18 60 28 60 28 V32 C60 34 58 36 56 36 H8 C6 36 4 34 4 32 V28 Z" fill={C.body} />
        <path d="M22 18 C22 18 24 12 28 12 H40 C44 12 46 18 46 18 H22 Z" fill={C.window} />
        <path d="M8 30 H56" stroke={C.bodyDark} strokeWidth="1" />
    </IconSVG>
);

// 9. BATTERY (Smooth SVG)
export const BatteryJumpIcon = (props: LucideProps) => (
    <IconSVG {...props}>
        <rect x="12" y="14" width="40" height="24" rx="4" fill={C.window} />
        <path d="M20 14 V8" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" />
        <path d="M44 14 V8" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" />
        <path d="M28 26 L32 22 L36 26" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M32 22 V30" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </IconSVG>
);

export const BatteryReplacementIcon = (props: LucideProps) => (
    <IconSVG {...props}>
        <rect x="12" y="14" width="40" height="24" rx="4" fill={C.body} />
        <path d="M20 14 V8" stroke={C.tire} strokeWidth="6" strokeLinecap="round" />
        <path d="M44 14 V8" stroke={C.tire} strokeWidth="6" strokeLinecap="round" />
        <path d="M28 24 L32 28 L36 24" stroke={C.tire} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M32 28 V18" stroke={C.tire} strokeWidth="3" strokeLinecap="round" />
    </IconSVG>
);
