'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Shield, 
  Target,
  AlertTriangle,
  Calculator,
  Info,
  CheckCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const OrderPanel = ({ 
  instrument = 'EUR_USD',
  currentPrice = { bid: 1.0850, ask: 1.0852 },
  accountBalance = 10000,
  onPlaceOrder,
  className = ''
}) => {
  const [orderType, setOrderType] = useState('market'); // market, limit, stop
  const [direction, setDirection] = useState('buy'); // buy, sell
  const [lotSize, setLotSize] = useState(0.01);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [orderSummary, setOrderSummary] = useState(null);
  const [riskPercent, setRiskPercent] = useState(2);

  // Kalkulasi margin dan risiko
  const calculateOrderDetails = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const price = direction === 'buy' ? currentPrice.ask : currentPrice.bid;
      const orderValue = lotSize * 100000 * price; // Standard lot = 100,000 units
      const margin = orderValue / 50; // Leverage 1:50
      const spread = currentPrice.ask - currentPrice.bid;
      
      let potentialLoss = 0;
      let potentialProfit = 0;
      
      if (stopLoss) {
        const slPrice = parseFloat(stopLoss);
        potentialLoss = Math.abs(price - slPrice) * lotSize * 100000;
      }
      
      if (takeProfit) {
        const tpPrice = parseFloat(takeProfit);
        potentialProfit = Math.abs(tpPrice - price) * lotSize * 100000;
      }
      
      setOrderSummary({
        orderValue,
        margin,
        spread: spread * 10000, // dalam pips
        potentialLoss,
        potentialProfit,
        riskRewardRatio: potentialLoss > 0 ? (potentialProfit / potentialLoss).toFixed(2) : 0
      });
      
      setIsCalculating(false);
    }, 500);
  };

  // Auto calculate ketika parameter berubah
  useEffect(() => {
    calculateOrderDetails();
  }, [lotSize, stopLoss, takeProfit, direction, currentPrice]);

  // Kalkulasi lot size berdasarkan risiko
  const calculateLotSizeByRisk = () => {
    if (!stopLoss) {
      toast.error('Masukkan Stop Loss terlebih dahulu');
      return;
    }
    
    const price = direction === 'buy' ? currentPrice.ask : currentPrice.bid;
    const slPrice = parseFloat(stopLoss);
    const pipsDifference = Math.abs(price - slPrice) * 10000;
    const riskAmount = accountBalance * (riskPercent / 100);
    const pipValue = 1; // $1 per pip untuk lot standar
    
    const calculatedLotSize = riskAmount / (pipsDifference * pipValue);
    setLotSize(Math.max(0.01, Math.round(calculatedLotSize * 100) / 100));
    
    toast.success(`Lot size dihitung: ${calculatedLotSize.toFixed(2)}`);
  };

  // Validasi order
  const validateOrder = () => {
    if (lotSize < 0.01) {
      toast.error('Minimum lot size adalah 0.01');
      return false;
    }
    
    if (lotSize > 100) {
      toast.error('Maximum lot size adalah 100');
      return false;
    }
    
    if (orderSummary && orderSummary.margin > accountBalance) {
      toast.error('Margin tidak mencukupi');
      return false;
    }
    
    if (orderType === 'limit' && !limitPrice) {
      toast.error('Masukkan harga limit');
      return false;
    }
    
    return true;
  };

  // Submit order
  const handlePlaceOrder = () => {
    if (!validateOrder()) return;
    
    const orderData = {
      instrument,
      type: orderType,
      direction,
      lotSize,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      limitPrice: limitPrice ? parseFloat(limitPrice) : null,
      currentPrice: direction === 'buy' ? currentPrice.ask : currentPrice.bid
    };
    
    if (onPlaceOrder) {
      onPlaceOrder(orderData);
    }
    
    toast.success(`Order ${direction.toUpperCase()} berhasil ditempatkan!`);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format price
  const formatPrice = (price) => {
    return price.toFixed(5);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6 ${className}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Panel Order</h3>
          <div className="text-sm text-gray-400">
            Saldo: {formatCurrency(accountBalance)}
          </div>
        </div>

        {/* Instrument & Price */}
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-medium text-white">{instrument}</h4>
            <div className="text-sm text-gray-400">
              Spread: {((currentPrice.ask - currentPrice.bid) * 10000).toFixed(1)} pips
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Bid</div>
              <div className="text-xl font-bold text-red-400">
                {formatPrice(currentPrice.bid)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Ask</div>
              <div className="text-xl font-bold text-green-400">
                {formatPrice(currentPrice.ask)}
              </div>
            </div>
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Jenis Order
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'market', label: 'Market' },
              { value: 'limit', label: 'Limit' },
              { value: 'stop', label: 'Stop' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setOrderType(type.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  orderType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Direction */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Arah Trading
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection('buy')}
              className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                direction === 'buy'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>BELI</span>
            </button>
            <button
              onClick={() => setDirection('sell')}
              className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                direction === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>JUAL</span>
            </button>
          </div>
        </div>

        {/* Lot Size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">
              Ukuran Lot
            </label>
            <button
              onClick={calculateLotSizeByRisk}
              className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300"
            >
              <Calculator className="w-3 h-3" />
              <span>Hitung Otomatis</span>
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={lotSize}
              onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center space-x-1">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 2)}
                className="w-16 px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
          </div>
        </div>

        {/* Limit Price (jika order type = limit) */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Harga Limit
            </label>
            <input
              type="number"
              step="0.00001"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={formatPrice(currentPrice.ask)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {/* Stop Loss & Take Profit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Shield className="w-4 h-4 inline mr-1" />
              Stop Loss
            </label>
            <input
              type="number"
              step="0.00001"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Target className="w-4 h-4 inline mr-1" />
              Take Profit
            </label>
            <input
              type="number"
              step="0.00001"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Order Summary */}
        {orderSummary && (
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Ringkasan Order</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Nilai Order:</span>
                <span className="text-white">{formatCurrency(orderSummary.orderValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Margin:</span>
                <span className="text-white">{formatCurrency(orderSummary.margin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Spread:</span>
                <span className="text-white">{orderSummary.spread.toFixed(1)} pips</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">R:R Ratio:</span>
                <span className="text-white">{orderSummary.riskRewardRatio}</span>
              </div>
              {orderSummary.potentialLoss > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Loss:</span>
                  <span className="text-red-400">{formatCurrency(orderSummary.potentialLoss)}</span>
                </div>
              )}
              {orderSummary.potentialProfit > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Profit:</span>
                  <span className="text-green-400">{formatCurrency(orderSummary.potentialProfit)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-200">
              <p className="font-medium mb-1">Peringatan Risiko:</p>
              <p>Trading forex memiliki risiko tinggi. Pastikan Anda memahami risiko yang terlibat dan jangan trading dengan uang yang tidak mampu Anda rugikan.</p>
            </div>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={isCalculating}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
            direction === 'buy'
              ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
              : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
          } ${isCalculating ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
        >
          {isCalculating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Menghitung...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>
                {direction === 'buy' ? 'BELI' : 'JUAL'} {instrument}
              </span>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default OrderPanel;