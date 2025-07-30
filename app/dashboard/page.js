'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Bot, 
  Settings, 
  Activity, 
  AlertTriangle,
  Play,
  Pause,
  Square,
  Zap,
  Shield,
  Target,
  Brain,
  RefreshCw,
  LineChart,
  PieChart,
  Gauge,
  Clock,
  Users,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  TrendingRight,
  Eye,
  EyeOff,
  ChevronRight,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [bots, setBots] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [accountStats, setAccountStats] = useState({
    balance: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    marginLevel: 0,
    totalProfit: 0,
    totalLoss: 0,
    winRate: 0,
    totalTrades: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Simulated data - in real app this would come from APIs
  useEffect(() => {
    const timer = setTimeout(() => {
      setBots([
        {
          id: 1,
          name: "AI Scalper Pro",
          strategy: "Scalping",
          status: "active",
          pair: "EUR/USD",
          profit: 1250.50,
          trades: 45,
          winRate: 78.5,
          drawdown: 5.2,
          lastSignal: "BUY",
          confidence: 85
        },
        {
          id: 2,
          name: "Grid Master",
          strategy: "Grid Trading",
          status: "active",
          pair: "GBP/USD",
          profit: 890.25,
          trades: 32,
          winRate: 65.8,
          drawdown: 8.1,
          lastSignal: "SELL",
          confidence: 72
        },
        {
          id: 3,
          name: "DCA Bot",
          strategy: "Dollar Cost Averaging",
          status: "paused",
          pair: "USD/JPY",
          profit: -150.75,
          trades: 18,
          winRate: 45.2,
          drawdown: 12.5,
          lastSignal: "HOLD",
          confidence: 55
        }
      ]);

      setMarketData({
        'EUR/USD': { price: 1.0845, change: 0.0023, changePercent: 0.21 },
        'GBP/USD': { price: 1.2678, change: -0.0045, changePercent: -0.35 },
        'USD/JPY': { price: 149.82, change: 0.45, changePercent: 0.30 },
        'USD/CHF': { price: 0.8756, change: 0.0012, changePercent: 0.14 },
        'AUD/USD': { price: 0.6534, change: -0.0018, changePercent: -0.27 }
      });

      setAccountStats({
        balance: 10000.00,
        equity: 11250.75,
        margin: 2500.00,
        freeMargin: 8750.75,
        marginLevel: 450.03,
        totalProfit: 2890.50,
        totalLoss: -1640.25,
        winRate: 68.5,
        totalTrades: 125
      });

      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'bots', label: 'Trading Bots', icon: Bot },
    { id: 'market', label: 'Market Data', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const StatCard = ({ title, value, change, icon: Icon, color = "blue" }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              change > 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {change > 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
      </div>
    </motion.div>
  );

  const BotCard = ({ bot }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            bot.status === 'active' ? 'bg-emerald-400' : 
            bot.status === 'paused' ? 'bg-yellow-400' : 'bg-red-400'
          }`} />
          <div>
            <h3 className="text-lg font-semibold text-white">{bot.name}</h3>
            <p className="text-slate-400 text-sm">{bot.strategy} • {bot.pair}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {bot.status === 'active' ? (
            <button className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
              <Play className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-slate-400 text-xs">Profit/Loss</p>
          <p className={`text-lg font-semibold ${
            bot.profit > 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            ${bot.profit > 0 ? '+' : ''}${bot.profit.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Win Rate</p>
          <p className="text-lg font-semibold text-white">{bot.winRate}%</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Trades</p>
          <p className="text-lg font-semibold text-white">{bot.trades}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Drawdown</p>
          <p className="text-lg font-semibold text-red-400">{bot.drawdown}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 text-sm">Last Signal:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            bot.lastSignal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
            bot.lastSignal === 'SELL' ? 'bg-red-500/20 text-red-400' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {bot.lastSignal}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-400">{bot.confidence}%</span>
        </div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Bot className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">ForexBot Pro</h1>
                <p className="text-slate-400">Welcome back, {user?.firstName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm">Live Market</span>
              </div>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus className="w-4 h-4 mr-2 inline" />
                New Bot
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-800/30 rounded-lg p-1 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Account Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Account Balance"
                value={`$${accountStats.balance.toLocaleString()}`}
                icon={DollarSign}
                color="blue"
              />
              <StatCard
                title="Equity"
                value={`$${accountStats.equity.toLocaleString()}`}
                change={12.5}
                icon={TrendingUp}
                color="emerald"
              />
              <StatCard
                title="Total Profit"
                value={`$${accountStats.totalProfit.toLocaleString()}`}
                change={8.2}
                icon={Target}
                color="emerald"
              />
              <StatCard
                title="Win Rate"
                value={`${accountStats.winRate}%`}
                change={2.1}
                icon={Gauge}
                color="blue"
              />
            </div>

            {/* Active Bots Overview */}
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Active Trading Bots</h2>
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">{bots.filter(bot => bot.status === 'active').length} Active</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {bots.map((bot) => (
                  <BotCard key={bot.id} bot={bot} />
                ))}
              </div>
            </div>

            {/* Market Overview */}
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">Market Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(marketData).map(([pair, data]) => (
                  <div key={pair} className="bg-slate-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 font-medium">{pair}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        data.change > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {data.change > 0 ? '+' : ''}{data.changePercent}%
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-white">{data.price}</div>
                    <div className={`text-sm ${data.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.change > 0 ? '+' : ''}{data.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trading Bots Tab */}
        {activeTab === 'bots' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Trading Bots Management</h2>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Plus className="w-4 h-4 mr-2 inline" />
                Create New Bot
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bots.map((bot) => (
                <div key={bot.id} className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        bot.status === 'active' ? 'bg-emerald-400' : 
                        bot.status === 'paused' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <h3 className="text-lg font-semibold text-white">{bot.name}</h3>
                        <p className="text-slate-400 text-sm">{bot.strategy}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Currency Pair</label>
                        <input 
                          type="text" 
                          value={bot.pair} 
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Status</label>
                        <select className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white">
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="stopped">Stopped</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-slate-700/30 rounded-lg p-3">
                        <p className="text-slate-400 text-xs">Profit</p>
                        <p className={`text-lg font-semibold ${
                          bot.profit > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          ${bot.profit.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-3">
                        <p className="text-slate-400 text-xs">Win Rate</p>
                        <p className="text-lg font-semibold text-white">{bot.winRate}%</p>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-3">
                        <p className="text-slate-400 text-xs">Trades</p>
                        <p className="text-lg font-semibold text-white">{bot.trades}</p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {bot.status === 'active' ? (
                        <button className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg transition-colors">
                          <Pause className="w-4 h-4 mr-2 inline" />
                          Pause Bot
                        </button>
                      ) : (
                        <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors">
                          <Play className="w-4 h-4 mr-2 inline" />
                          Start Bot
                        </button>
                      )}
                      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Data Tab */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Live Market Data</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(marketData).map(([pair, data]) => (
                <div key={pair} className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">{pair}</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-emerald-400 text-sm">Live</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 text-sm">Current Price</p>
                      <p className="text-3xl font-bold text-white">{data.price}</p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-slate-400 text-sm">Change</p>
                        <p className={`text-lg font-semibold ${
                          data.change > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {data.change > 0 ? '+' : ''}{data.change}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Change %</p>
                        <p className={`text-lg font-semibold ${
                          data.changePercent > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {data.changePercent > 0 ? '+' : ''}{data.changePercent}%
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">24h High</span>
                        <span className="text-white">{(data.price + Math.abs(data.change) * 2).toFixed(4)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-slate-400">24h Low</span>
                        <span className="text-white">{(data.price - Math.abs(data.change) * 2).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Trading Analytics</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Trades</span>
                    <span className="text-white font-semibold">{accountStats.totalTrades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Win Rate</span>
                    <span className="text-emerald-400 font-semibold">{accountStats.winRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Profit</span>
                    <span className="text-emerald-400 font-semibold">${accountStats.totalProfit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Loss</span>
                    <span className="text-red-400 font-semibold">${accountStats.totalLoss}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Profit Factor</span>
                    <span className="text-blue-400 font-semibold">
                      {(Math.abs(accountStats.totalProfit / accountStats.totalLoss)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Risk Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Max Drawdown</span>
                    <span className="text-red-400 font-semibold">12.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Current Drawdown</span>
                    <span className="text-yellow-400 font-semibold">5.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Margin Level</span>
                    <span className="text-emerald-400 font-semibold">{accountStats.marginLevel}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Used Margin</span>
                    <span className="text-white font-semibold">${accountStats.margin}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Free Margin</span>
                    <span className="text-white font-semibold">${accountStats.freeMargin}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Risk Management</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Max Drawdown (%)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      defaultValue="15"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Max Daily Loss (%)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      defaultValue="5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Max Position Size (%)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      defaultValue="2"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Email Notifications</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Trade Alerts</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Performance Reports</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Risk Warnings</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                Cancel
              </button>
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}