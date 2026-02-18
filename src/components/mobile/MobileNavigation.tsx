'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  TrendingUp, 
  Plus, 
  BarChart3, 
  User, 
  Search,
  Wallet,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../../utils';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface MobileNavigationProps {
  currentPage?: 'home' | 'trading' | 'create' | 'analytics' | 'profile';
  onNavigate?: (page: string) => void;
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentPage = 'home',
  onNavigate,
  className
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const haptic = useHapticFeedback();

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home, color: 'text-blue-400' },
    { id: 'trading', label: 'Trading', icon: TrendingUp, color: 'text-green-400' },
    { id: 'create', label: 'Create', icon: Plus, color: 'text-yellow-400', isAction: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-orange-400' },
    { id: 'profile', label: 'Profile', icon: User, color: 'text-pink-400' }
  ];

  const quickActions = [
    { id: 'create-token', label: 'Create Token', icon: Plus, color: 'bg-yellow-500' },
    { id: 'quick-trade', label: 'Quick Trade', icon: TrendingUp, color: 'bg-green-500' },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet, color: 'bg-blue-500' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'bg-yellow-500' }
  ];

  // Auto-hide navigation on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setShowQuickActions(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleNavigation = (pageId: string) => {
    haptic.trigger('selection');
    
    if (pageId === 'create' && !showQuickActions) {
      setShowQuickActions(true);
      return;
    }
    
    onNavigate?.(pageId);
    setShowQuickActions(false);
  };

  const handleQuickAction = (actionId: string) => {
    haptic.trigger('medium');
    onNavigate?.(actionId);
    setShowQuickActions(false);
  };

  return (
    <>
      {/* Quick Actions Overlay */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setShowQuickActions(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                  <button
                    onClick={() => setShowQuickActions(false)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickAction(action.id)}
                        className={cn(
                          'p-4 rounded-xl text-white font-medium transition-all',
                          'flex flex-col items-center space-y-2',
                          'hover:shadow-lg active:shadow-md',
                          action.color
                        )}
                      >
                        <Icon size={24} />
                        <span className="text-sm">{action.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'bg-black/80 backdrop-blur-xl border-t border-white/10',
          className
        )}
      >
        {/* Safe area for devices with bottom indicator */}
        <div className="px-4 pt-2 pb-safe">
          <div className="flex items-center justify-around">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const isCreateButton = item.isAction;
              
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNavigation(item.id)}
                  className={cn(
                    'relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200',
                    'min-w-[60px] min-h-[60px] justify-center',
                    isCreateButton
                      ? 'bg-yellow-500/20 text-yellow-400 shadow-lg shadow-yellow-500/25 border border-yellow-500/20'
                      : isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && !isCreateButton && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-yellow-500 rounded-full"
                    />
                  )}
                  
                  {/* Icon */}
                  <div className={cn(
                    'relative',
                    isCreateButton && 'transform rotate-0 transition-transform duration-200',
                    showQuickActions && isCreateButton && 'rotate-45'
                  )}>
                    <Icon size={isCreateButton ? 24 : 20} className={cn(
                      isCreateButton ? 'text-white' : isActive ? 'text-white' : item.color
                    )} />
                  </div>
                  
                  {/* Label */}
                  <span className={cn(
                    'text-xs mt-1 font-medium transition-colors',
                    isCreateButton 
                      ? 'text-white' 
                      : isActive 
                      ? 'text-white' 
                      : 'text-gray-500'
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Notification badges (example) */}
                  {item.id === 'trading' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">3</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
};

// Mobile Header Component
export interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
  onMenu?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showSearch = false,
  showMenu = false,
  onBack,
  onSearch,
  onMenu,
  rightAction,
  className
}) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'sticky top-0 z-40 bg-black/80 backdrop-blur-xl',
        'border-b border-white/10 md:hidden',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 h-16">
        {/* Left section */}
        <div className="flex items-center space-x-3">
          {showBack && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </motion.button>
          )}
          
          {showMenu && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMenu}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg"
            >
              <Menu size={20} />
            </motion.button>
          )}
          
          <div>
            <h1 className="text-lg font-semibold text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-400">{subtitle}</p>
            )}
          </div>
        </div>
        
        {/* Right section */}
        <div className="flex items-center space-x-2">
          {showSearch && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSearch}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg"
            >
              <Search size={20} />
            </motion.button>
          )}
          
          {rightAction}
        </div>
      </div>
    </motion.header>
  );
};

// Hook for mobile navigation state
export const useMobileNavigation = () => {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [isVisible, setIsVisible] = useState(true);
  
  const navigate = (page: string) => {
    setCurrentPage(page);
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  const hide = () => setIsVisible(false);
  const show = () => setIsVisible(true);
  
  return {
    currentPage,
    isVisible,
    navigate,
    hide,
    show
  };
};