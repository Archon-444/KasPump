'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Rocket,
  Clock,
  Users,
  Share2,
  Bell,
  CheckCircle2,
  AlertCircle,
  Twitter,
  Send,
  Globe,
  TrendingUp,
  Lock,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { Card, Badge, Button, Input, Progress } from '../ui';
import { formatCurrency, cn } from '../../utils';

interface PreLaunchToken {
  name: string;
  symbol: string;
  description: string;
  image: string;
  creator: string;
  creatorName?: string;
  launchDate: Date;
  targetMarketCap: number;
  initialPrice: number;
  totalSupply: number;
  curveType: 'linear' | 'exponential';
  socials?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
  previewUrl?: string;
}

interface LaunchPadProps {
  token: PreLaunchToken;
  onNotifyMe?: (email: string) => Promise<void>;
  onShare?: (platform: 'twitter' | 'telegram') => void;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
}

const calculateTimeRemaining = (launchDate: Date): TimeRemaining => {
  const now = new Date();
  const diff = launchDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isLive: false };
};

const LaunchPad: React.FC<LaunchPadProps> = ({
  token,
  onNotifyMe,
  onShare,
  className,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(token.launchDate)
  );
  const [email, setEmail] = useState('');
  const [notificationSent, setNotificationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [earlySignups, setEarlySignups] = useState(247); // Mock data

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(token.launchDate);
      setTimeRemaining(remaining);

      if (remaining.isLive) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [token.launchDate]);

  // Validation checks
  const validationChecks = useMemo(() => [
    {
      label: 'Token economics configured',
      passed: token.initialPrice > 0 && token.totalSupply > 0,
      critical: true,
    },
    {
      label: 'Branding and metadata ready',
      passed: token.image && token.description,
      critical: true,
    },
    {
      label: 'Social media links added',
      passed: !!(token.socials?.twitter || token.socials?.telegram || token.socials?.website),
      critical: false,
    },
    {
      label: 'Creator verified',
      passed: token.creator && token.creator !== '0x0',
      critical: true,
    },
    {
      label: 'Launch date scheduled',
      passed: token.launchDate > new Date(),
      critical: true,
    },
    {
      label: 'Community building active',
      passed: earlySignups > 100,
      critical: false,
    },
  ], [token, earlySignups]);

  const criticalChecksPassed = validationChecks.filter(c => c.critical && c.passed).length;
  const totalCriticalChecks = validationChecks.filter(c => c.critical).length;
  const allChecksPassed = validationChecks.filter(c => c.passed).length;
  const launchReadiness = (allChecksPassed / validationChecks.length) * 100;

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onNotifyMe?.(email);
      setNotificationSent(true);
      setEarlySignups(prev => prev + 1);
      setEmail('');
    } catch (error) {
      console.error('Failed to subscribe:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    const link = token.previewUrl || window.location.href;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `🚀 ${token.name} ($${token.symbol}) is launching soon on @KasPump!\n\nJoin the early community and be ready for launch day!`;

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* Hero Section */}
      <Card className="glassmorphism mb-6 overflow-hidden">
        <div className="relative">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient" />

          <div className="relative p-8">
            {/* Launch Status Badge */}
            <div className="flex items-center justify-between mb-6">
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <Rocket className="w-3 h-3 mr-1" />
                Pre-Launch
              </Badge>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4" />
                <span>{earlySignups} early supporters</span>
              </div>
            </div>

            {/* Token Info */}
            <div className="flex items-start gap-6 mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                {token.image ? (
                  <img src={token.image} alt={token.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">{token.symbol.slice(0, 2)}</span>
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{token.name}</h1>
                <p className="text-xl text-gray-400 mb-3">${token.symbol}</p>
                <p className="text-gray-300 leading-relaxed">{token.description}</p>

                {/* Social Links */}
                {token.socials && (
                  <div className="flex items-center gap-3 mt-4">
                    {token.socials.twitter && (
                      <a
                        href={`https://twitter.com/${token.socials.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                        aria-label="Twitter"
                      >
                        <Twitter className="w-4 h-4 text-blue-400" />
                      </a>
                    )}
                    {token.socials.telegram && (
                      <a
                        href={token.socials.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-400/20 hover:bg-blue-400/30 rounded-lg transition-colors"
                        aria-label="Telegram"
                      >
                        <Send className="w-4 h-4 text-blue-300" />
                      </a>
                    )}
                    {token.socials.website && (
                      <a
                        href={token.socials.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                        aria-label="Website"
                      >
                        <Globe className="w-4 h-4 text-purple-400" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Countdown Timer */}
            {!timeRemaining.isLive ? (
              <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700/50">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Launching In:</h3>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Days', value: timeRemaining.days },
                    { label: 'Hours', value: timeRemaining.hours },
                    { label: 'Minutes', value: timeRemaining.minutes },
                    { label: 'Seconds', value: timeRemaining.seconds },
                  ].map(({ label, value }) => (
                    <motion.div
                      key={label}
                      className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl p-4 text-center border border-slate-600/30"
                      animate={{ scale: label === 'Seconds' ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 1, repeat: label === 'Seconds' ? Infinity : 0 }}
                    >
                      <div className="text-3xl font-bold text-white mb-1">
                        {value.toString().padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-400 uppercase">{label}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="text-center mt-4 text-sm text-gray-400">
                  Launch Date: {token.launchDate.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-6 mb-6 text-center">
                <Sparkles className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-green-400 mb-2">🎉 Launch is LIVE!</h3>
                <p className="text-gray-300">Token is now available for trading</p>
                <Button className="mt-4 bg-green-600 hover:bg-green-700">
                  Start Trading Now
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Token Economics */}
        <Card className="glassmorphism p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Token Economics
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
              <span className="text-gray-400">Initial Price</span>
              <span className="font-semibold text-white">
                {formatCurrency(token.initialPrice, 'BNB', 8)}
              </span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
              <span className="text-gray-400">Total Supply</span>
              <span className="font-semibold text-white">
                {token.totalSupply.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
              <span className="text-gray-400">Target Market Cap</span>
              <span className="font-semibold text-white">
                {formatCurrency(token.targetMarketCap, 'BNB')}
              </span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
              <span className="text-gray-400">Curve Type</span>
              <Badge variant="secondary" className="capitalize">
                {token.curveType}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Creator</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-white">
                  {token.creatorName || `${token.creator.slice(0, 6)}...${token.creator.slice(-4)}`}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Launch Readiness */}
        <Card className="glassmorphism p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Launch Readiness
          </h3>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Overall Progress</span>
              <span className="font-semibold text-white">{Math.round(launchReadiness)}%</span>
            </div>
            <Progress value={launchReadiness} className="h-2" />
          </div>

          <div className="space-y-3">
            {validationChecks.map((check, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  check.passed
                    ? 'bg-green-500/10 border border-green-500/20'
                    : check.critical
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-yellow-500/10 border border-yellow-500/20'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    check.passed ? 'bg-green-500' : check.critical ? 'bg-red-500' : 'bg-yellow-500'
                  )}
                >
                  {check.passed ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : check.critical ? (
                    <AlertCircle className="w-3 h-3 text-white" />
                  ) : (
                    <Lock className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm', check.passed ? 'text-green-300' : 'text-gray-300')}>
                      {check.label}
                    </span>
                    {check.critical && !check.passed && (
                      <Badge variant="danger" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {criticalChecksPassed < totalCriticalChecks && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-300">
                {totalCriticalChecks - criticalChecksPassed} critical check
                {totalCriticalChecks - criticalChecksPassed > 1 ? 's' : ''} remaining before launch
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Notify Me & Share */}
      <Card className="glassmorphism p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Notifications */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-400" />
              Get Launch Notifications
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Be the first to know when {token.name} goes live
            </p>

            {!notificationSent ? (
              <form onSubmit={handleNotifyMe} className="space-y-3">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-800/50 border-slate-700"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? (
                    'Subscribing...'
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Notify Me at Launch
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-300 font-medium">You're on the list!</p>
                <p className="text-sm text-gray-400 mt-1">
                  We'll notify you when {token.name} launches
                </p>
              </div>
            )}
          </div>

          {/* Social Sharing */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-400" />
              Spread the Word
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Share {token.name} with your community
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(token.previewUrl || window.location.href)}`;
                  window.open(twitterUrl, '_blank');
                  onShare?.('twitter');
                }}
                variant="outline"
                className="w-full bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
              >
                <Twitter className="w-4 h-4 mr-2 text-blue-400" />
                Share on Twitter
              </Button>

              <Button
                onClick={() => {
                  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(token.previewUrl || window.location.href)}&text=${encodeURIComponent(shareText)}`;
                  window.open(telegramUrl, '_blank');
                  onShare?.('telegram');
                }}
                variant="outline"
                className="w-full bg-blue-400/10 border-blue-400/30 hover:bg-blue-400/20"
              >
                <Send className="w-4 h-4 mr-2 text-blue-300" />
                Share on Telegram
              </Button>

              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/70"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LaunchPad;
