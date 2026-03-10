'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Search,
  Briefcase,
  BarChart3,
  HelpCircle,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Palette,
  Bell,
  Wallet,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { MobileNavigation } from '../mobile';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useFavorites } from '../../hooks/useFavorites';
import { cn } from '../../utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
}

const primaryNavItems: NavItem[] = [
  {
    label: 'Discover',
    href: '/',
    icon: <Search size={20} />,
    description: 'Browse live tokens',
  },
  {
    label: 'Launch',
    href: '/launch',
    icon: <Rocket size={20} />,
    description: 'Create a new token',
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    icon: <Briefcase size={20} />,
    description: 'Your positions',
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 size={20} />,
    description: 'Platform metrics',
  },
];

const secondaryNavItems: NavItem[] = [
  {
    label: 'Favorites',
    href: '/favorites',
    icon: <Star size={20} />,
  },
  {
    label: 'Alerts',
    href: '/alerts',
    icon: <Bell size={20} />,
  },
  {
    label: 'Creator',
    href: '/creator',
    icon: <Palette size={20} />,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings size={20} />,
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const favorites = useFavorites();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [WalletConnectButton, setWalletConnectButton] = useState<React.ComponentType<any> | null>(null);

  // Dynamically load WalletConnectButton only on client side after Web3Provider is ready
  useEffect(() => {
    import('../features/WalletConnectButton')
      .then((module) => {
        setWalletConnectButton(() => module.WalletConnectButton);
      })
      .catch((error) => {
        console.error('Failed to load WalletConnectButton:', error);
      });
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  const handleMobileNavigation = (page: string) => {
    switch (page) {
      case 'home':
        router.push('/');
        break;
      case 'trading':
        router.push('/');
        break;
      case 'create':
        router.push('/launch');
        break;
      case 'analytics':
        router.push('/analytics');
        break;
      case 'profile':
        router.push('/portfolio');
        break;
      default:
        break;
    }
  };

  // Determine current mobile page from pathname
  const currentMobilePage = (() => {
    if (pathname === '/') return 'home';
    if (pathname === '/launch') return 'create';
    if (pathname === '/analytics') return 'analytics';
    if (pathname === '/portfolio') return 'profile';
    return 'home';
  })() as 'home' | 'trading' | 'create' | 'analytics' | 'profile';

  if (isMobile) {
    return (
      <div className="min-h-screen pb-20">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[hsl(225,15%,4%)]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <a href="/" className="text-base font-semibold text-white flex items-center gap-2 tracking-tight">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-glow-sm">
                <Rocket size={14} className="text-white" />
              </div>
              <span>KasPump</span>
            </a>

            {WalletConnectButton && <WalletConnectButton />}
          </div>

          {/* Mobile Dropdown Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-white/[0.06] bg-[hsl(225,15%,5%)]/95 backdrop-blur-xl overflow-hidden"
              >
                <nav className="p-3 space-y-0.5">
                  {[...primaryNavItems, ...secondaryNavItems].map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive(item.href)
                          ? 'bg-yellow-500/[0.12] text-yellow-400'
                          : 'text-gray-400 hover:text-white hover:bg-white/[0.04]',
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {item.label === 'Favorites' && favorites.favoriteCount > 0 && (
                        <span className="ml-auto bg-yellow-400/90 text-gray-900 text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                          {favorites.favoriteCount}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Mobile Content */}
        <main>{children}</main>

        {/* Mobile Bottom Navigation */}
        <MobileNavigation
          currentPage={currentMobilePage}
          onNavigate={handleMobileNavigation}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/[0.06] bg-[hsl(225,15%,5%)]/80 backdrop-blur-xl transition-all duration-300 ease-smooth',
          sidebarCollapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-white/[0.06]',
          sidebarCollapsed ? 'justify-center' : 'gap-3',
        )}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
            <Rocket size={16} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-base font-semibold text-white tracking-tight">KasPump</span>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className={cn('text-[10px] uppercase text-gray-500/80 font-semibold tracking-wider mb-3', sidebarCollapsed ? 'text-center' : 'px-3')}>
            {sidebarCollapsed ? '\u2022' : 'Main'}
          </div>
          {primaryNavItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ease-smooth group relative',
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive(item.href)
                  ? 'bg-yellow-500/[0.12] text-yellow-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]',
              )}
            >
              {isActive(item.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-yellow-400 rounded-r-full" />
              )}
              <span className="flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <div>{item.label}</div>
                </div>
              )}
              {!sidebarCollapsed && item.badge && (
                <span className="bg-yellow-500 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div className="my-4 mx-3 border-t border-white/[0.06]" />

          <div className={cn('text-[10px] uppercase text-gray-500/80 font-semibold tracking-wider mb-3', sidebarCollapsed ? 'text-center' : 'px-3')}>
            {sidebarCollapsed ? '\u2022' : 'More'}
          </div>
          {secondaryNavItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ease-smooth relative',
                sidebarCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                isActive(item.href)
                  ? 'bg-yellow-500/[0.12] text-yellow-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]',
              )}
            >
              {isActive(item.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-yellow-400 rounded-r-full" />
              )}
              <span className="flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.label === 'Favorites' && favorites.favoriteCount > 0 && (
                <span className="ml-auto bg-yellow-400/90 text-gray-900 text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                  {favorites.favoriteCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all duration-200 text-sm"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300 ease-smooth',
        sidebarCollapsed ? 'ml-[68px]' : 'ml-60',
      )}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-14 border-b border-white/[0.06] bg-[hsl(225,15%,4%)]/70 backdrop-blur-xl">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-medium text-white">
                {primaryNavItems.find(item => isActive(item.href))?.label ||
                 secondaryNavItems.find(item => isActive(item.href))?.label ||
                 'KasPump'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigation('/favorites')}
                className="p-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-white/[0.04] transition-all duration-200 relative"
                title="Favorites"
              >
                <Star size={17} />
                {favorites.favoriteCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-400 text-gray-900 rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {favorites.favoriteCount > 99 ? '99+' : favorites.favoriteCount}
                  </span>
                )}
              </button>
              {WalletConnectButton && <WalletConnectButton />}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
