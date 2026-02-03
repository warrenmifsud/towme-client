import { Truck, Car, Battery, Anchor, AlertTriangle, Fuel, Key, HelpCircle } from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

// Helper for image-based icons matching Lucide styling props
const IconImage = (src: string) => {
    // eslint-disable-next-line react/display-name
    return ({ className = "", ...props }: LucideProps) => (
        <img
            src={src}
            alt="icon"
            className={className}
            style={{ objectFit: 'contain' }}
            {...props as any}
        />
    );
};

export const IconMap: Record<string, LucideIcon> = {
    'truck': Truck,
    'car.fill': Car,
    'car': Car,
    'battery': Battery,
    'anchor': Anchor,
    'tire': Anchor,
    'alert': AlertTriangle,
    'fuel': Fuel,
    'key': Key,
    'box_van': IconImage('/icons/box_van.webp') as unknown as LucideIcon,
    'van': IconImage('/icons/van.webp') as unknown as LucideIcon,
    'medium_van': IconImage('/icons/medium_van.webp') as unknown as LucideIcon,
};

export const getIcon = (name: string | null): LucideIcon => {
    if (!name) return HelpCircle;
    const lowerName = name.toLowerCase();
    return IconMap[lowerName] || IconMap[name] || HelpCircle;
};
