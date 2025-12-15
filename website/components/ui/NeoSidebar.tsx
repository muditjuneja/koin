"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
    { name: 'Introduction', href: '/docs' },
    { name: 'Installation', href: '/docs/installation' },
    { name: 'Basic Usage', href: '/docs/usage' },
    { name: 'Advanced Config', href: '/docs/advanced' },
    { name: 'Internationalization', href: '/docs/i18n' },
    { name: 'API Reference', href: '/docs/api' },
    { name: 'System Compatibility', href: '/docs/systems' },
    { name: 'Core Showcase', href: '/docs/showcase' },
    { name: 'Live Demo', href: '/#demo' },
];

export function NeoSidebar() {
    const pathname = usePathname();

    return (
        <nav className="w-full md:w-64 flex-shrink-0 border-r-4 border-black min-h-screen bg-zinc-100 p-6 space-y-6">
            <Link href="/" className="block">
                <div className="font-display font-black text-2xl mb-8 inline-block">
                    <span className="bg-retro-green text-black px-1">koin</span><span className="text-black">.js</span>
                </div>
            </Link>
            <ul className="space-y-4 font-mono">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`block px-4 py-2 border-2 transition-all ${isActive
                                    ? 'border-black bg-retro-green shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold'
                                    : 'border-transparent hover:border-black hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
