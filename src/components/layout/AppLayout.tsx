'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { WalletConnectButton } from '../features/WalletConnectButton';
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
        <header className="sticky top-0 z-40 border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <a href="/" className="text-lg font-bold text-white flex items-center gap-2">
              <Rocket size={20} className="text-yellow-400" />
              <span>KasPump</span>
            </a>

            <WalletConnectButton />
          </div>

          {/* Mobile Dropdown Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-800/50 bg-gray-900/95 backdrop-blur-md overflow-hidden"
              >
                <nav className="p-3 space-y-1">
                  {[...primaryNavItems, ...secondaryNavItems].map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800',
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {item.label === 'Favorites' && favorites.favoriteCount > 0 && (
                        <span className="ml-auto bg-yellow-500 text-gray-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
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
          'fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-gray-800/50 bg-gray-900/50 backdrop-blur-md transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-56',
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-gray-800/50',
          sidebarCollapsed ? 'justify-center' : 'gap-3',
        )}>
          <Rocket size={24} className="text-yellow-400 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-white">KasPump</span>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <div className={cn('text-[10px] uppercase text-gray-500 font-medium mb-2', sidebarCollapsed ? 'text-center' : 'px-3')}>
            {sidebarCollapsed ? '---' : 'Main'}
          </div>
          {primaryNavItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive(item.href)
                  ? 'bg-yellow-500/10 text-yellow-400 shadow-sm shadow-yellow-500/5'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <div>{item.label}</div>
                  {item.description && (
                    <div className="text-[10px] text-gray-500 font-normal">{item.description}</div>
                  )}
                </div>
              )}
              {!sidebarCollapsed && item.badge && (
                <span className="bg-yellow-500 text-gray-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="my-3 border-t border-gray-800/50" />

          {/* Secondary Navigation */}
          <div className={cn('text-[10px] uppercase text-gray-500 font-medium mb-2', sidebarCollapsed ? 'text-center' : 'px-3')}>
            {sidebarCollapsed ? '---' : 'More'}
          </div>
          {secondaryNavItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
                sidebarCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                isActive(item.href)
                  ? 'bg-yellow-500/10 text-yellow-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.label === 'Favorites' && favorites.favoriteCount > 0 && (
                <span className="ml-auto bg-yellow-500 text-gray-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {favorites.favoriteCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-gray-800/50">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors text-sm"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'ml-16' : 'ml-56',
      )}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-md">
          <div className="flex items-center justify-between h-full px-6">
            {/* Page Title / Breadcrumb */}
            <div className="text-sm text-gray-400">
              {primaryNavItems.find(item => isActive(item.href))?.label ||
               secondaryNavItems.find(item => isActive(item.href))?.label ||
               'KasPump'}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigation('/favorites')}
                className="p-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-gray-800 transition-colors relative"
                title="Favorites"
              >
                <Star size={18} />
                {favorites.favoriteCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-400 text-gray-900 rounded-full text-[10px] font-bold flex items-center justify-center">
                    {favorites.favoriteCount > 99 ? '99+' : favorites.favoriteCount}
                  </span>
                )}
              </button>
              <WalletConnectButton />
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
