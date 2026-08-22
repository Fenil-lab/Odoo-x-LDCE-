'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { user, signOut } = useAuth();
    const pathname = usePathname();

    if (!user) return null;

    const navLinks = [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/trips', label: 'My Trips' },
        { href: '/cities', label: 'Explore Cities' },
    ];

    return (
        <nav className="bg-white border-b border-border sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-text">GlobeTrotter</span>
                    </Link>

                    <div className="flex items-center gap-1">
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === link.href || pathname.startsWith(link.href + '/')
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-text-secondary hover:text-text hover:bg-surface-dim'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-text-secondary hidden sm:block">
                            {user.email}
                        </span>
                        <button
                            onClick={signOut}
                            className="text-sm text-text-secondary hover:text-danger transition-colors font-medium"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
