import React from 'react';
import OfficialLogo from '../assets/OFFICIAL TowMe Logo.png';

interface TowMeLogoProps {
    className?: string; // Allow external sizing/styling
}

export const TowMeLogo: React.FC<TowMeLogoProps> = ({ className = 'w-10 h-10' }) => {
    return (
        <div className={`${className} rounded-full bg-[#F9A825] flex items-center justify-center shadow-sm overflow-hidden border border-[#F9A825]`}>
            {/* The Logo itself is transparent PNG, so orange shows through */}
            <img src={OfficialLogo} alt="TowMe" className="w-full h-full object-cover p-0.5" />
        </div>
    );
};
