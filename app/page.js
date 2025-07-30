'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  Bot, 
  DollarSign,
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Target,
  Activity
} from 'lucide-react';

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrades: 0,
    successRate: 0,
    totalProfit: 0
  });

  useEffect(() => {
    // Simulate loading stats
    const timer = setTimeout(() => {
      setStats({
        totalUsers: 12847,
        totalTrades: 2847392,
        successRate: 89.4,
        totalProfit: 2847392
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const features = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "AI-Powered Trading",
      description: "Advanced algorithms analyze market patterns and execute trades with precision"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Risk Management",
      description: "Comprehensive risk controls including stop-loss, take-profit, and drawdown limits"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "High-Speed Execution",
      description: "Lightning-fast trade execution with minimal latency for optimal entry/exit points"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Real-time Analytics",
      description: "Live market data, performance metrics, and detailed trading analytics"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Multiple Strategies",
      description: "Scalping, DCA, Grid Trading, and custom strategies for all market conditions"
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: "24/7 Monitoring",
      description: "Continuous market monitoring and automated trading around the clock"
    }
  ];

  const strategies = [
    {
      name: "Scalping Bot",
      description: "High-frequency trading for quick profits",
      winRate: "92%",
      avgProfit: "$127/day",
      riskLevel: "Medium"
    },
    {
      name: "DCA Bot",
      description: "Dollar Cost Averaging for steady growth",
      winRate: "87%",
      avgProfit: "$89/day",
      riskLevel: "Low"
    },
    {
      name: "Grid Trading",
      description: "Profit from market volatility",
      winRate: "85%",
      avgProfit: "$156/day",
      riskLevel: "Medium"
    },
    {
      name: "Trend Following",
      description: "Ride the market trends for maximum gains",
      winRate: "78%",
      avgProfit: "$234/day",
      riskLevel: "High"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="relative z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Bot className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold text-white">ForexBot Pro</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#strategies" className="text-gray-300 hover:text-white transition-colors">Strategies</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
            </nav>
            <div className="flex space-x-4">
              {isSignedIn ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">Welcome, {user.firstName}!</span>
                  <Link 
                    href="/dashboard"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                </div>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 text-white hover:text-blue-400 transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Get Started
                    </button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-7xl font-bold text-white mb-6"
            >
              Professional
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                {" "}Forex Trading{" "}
              </span>
              Bot
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto"
            >
              Advanced AI-powered trading bot with comprehensive risk management, 
              multiple strategies, and real-time market analysis. Start trading like a pro today.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              {isSignedIn ? (
                <Link 
                  href="/dashboard"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <SignUpButton mode="modal">
                    <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all transform hover:scale-105">
                      <span>Start Trading Now</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </SignUpButton>
                  <button className="px-8 py-4 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/10 transition-all">
                    Watch Demo
                  </button>
                </>
              )}
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                {stats.totalUsers.toLocaleString()}+
              </div>
              <div className="text-gray-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                {stats.totalTrades.toLocaleString()}+
              </div>
              <div className="text-gray-400">Trades Executed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
                {stats.successRate}%
              </div>
              <div className="text-gray-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">
                ${stats.totalProfit.toLocaleString()}
              </div>
              <div className="text-gray-400">Total Profits</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Powerful Features for Professional Trading
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our advanced trading bot comes equipped with everything you need to succeed in the forex market
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-blue-400/50 transition-all"
              >
                <div className="text-blue-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trading Strategies */}
      <section id="strategies" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Multiple Trading Strategies
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Choose from our proven strategies or create your own custom trading approach
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {strategies.map((strategy, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-blue-400/50 transition-all"
              >
                <h3 className="text-xl font-semibold text-white mb-2">{strategy.name}</h3>
                <p className="text-gray-300 mb-4">{strategy.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="text-emerald-400 font-semibold">{strategy.winRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Profit:</span>
                    <span className="text-blue-400 font-semibold">{strategy.avgProfit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Risk Level:</span>
                    <span className={`font-semibold ${
                      strategy.riskLevel === 'Low' ? 'text-green-400' :
                      strategy.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {strategy.riskLevel}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Start Professional Trading?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of successful traders using our advanced forex trading bot
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isSignedIn ? (
              <Link 
                href="/dashboard"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-all transform hover:scale-105">
                    Start Free Trial
                  </button>
                </SignUpButton>
                <button className="px-8 py-4 border border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-all">
                  Contact Sales
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="w-6 h-6 text-blue-400" />
                <span className="text-lg font-bold text-white">ForexBot Pro</span>
              </div>
              <p className="text-gray-400">
                Professional forex trading bot with advanced AI and comprehensive risk management.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#strategies" className="hover:text-white transition-colors">Strategies</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ForexBot Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
