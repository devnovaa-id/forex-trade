'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { motion } from 'framer-motion';
import { 
  Maximize2, 
  Minimize2, 
  Settings, 
  TrendingUp, 
  BarChart3,
  Activity,
  RefreshCw
} from 'lucide-react';

const TradingChart = ({ 
  instrument = 'EUR_USD', 
  data = [], 
  onPriceUpdate,
  className = '',
  height = 400 
}) => {
  const chartContainerRef = useRef();
  const chart = useRef();
  const candleSeries = useRef();
  const volumeSeries = useRef();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Konfigurasi chart dalam bahasa Indonesia
  const chartOptions = {
    layout: {
      background: { type: 'solid', color: 'transparent' },
      textColor: '#d1d5db',
    },
    grid: {
      vertLines: { color: '#374151' },
      horzLines: { color: '#374151' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: '#374151',
      textColor: '#d1d5db',
    },
    timeScale: {
      borderColor: '#374151',
      textColor: '#d1d5db',
      timeVisible: true,
      secondsVisible: false,
    },
    watermark: {
      visible: true,
      fontSize: 24,
      horzAlign: 'left',
      vertAlign: 'top',
      color: 'rgba(171, 71, 188, 0.3)',
      text: 'OANDA MT5',
    },
  };

  // Inisialisasi chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chart.current = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: isFullscreen ? window.innerHeight - 100 : height,
    });

    // Candlestick series
    candleSeries.current = chart.current.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });

    // Volume series
    volumeSeries.current = chart.current.addHistogramSeries({
      color: '#6366f1',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Handle resize
    const handleResize = () => {
      if (chart.current && chartContainerRef.current) {
        chart.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 100 : height,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart.current) {
        chart.current.remove();
      }
    };
  }, [height, isFullscreen]);

  // Update data chart
  useEffect(() => {
    if (candleSeries.current && data.length > 0) {
      const formattedData = data.map(item => ({
        time: item.time,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
      }));

      const volumeData = data.map(item => ({
        time: item.time,
        value: item.volume || 0,
        color: item.close > item.open ? '#10b981' : '#ef4444',
      }));

      candleSeries.current.setData(formattedData);
      volumeSeries.current.setData(volumeData);

      // Update current price
      if (formattedData.length > 0) {
        const lastCandle = formattedData[formattedData.length - 1];
        const prevCandle = formattedData[formattedData.length - 2];
        
        setCurrentPrice(lastCandle.close);
        
        if (prevCandle) {
          const change = lastCandle.close - prevCandle.close;
          setPriceChange(change);
          
          // Callback untuk update harga
          if (onPriceUpdate) {
            onPriceUpdate({
              price: lastCandle.close,
              change: change,
              changePercent: (change / prevCandle.close) * 100,
            });
          }
        }
      }
    }
  }, [data, onPriceUpdate]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Refresh data
  const handleRefresh = () => {
    setIsLoading(true);
    // Simulasi refresh data
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Format harga
  const formatPrice = (price) => {
    if (!price) return '0.0000';
    return price.toFixed(5);
  };

  // Format perubahan harga
  const formatChange = (change) => {
    if (!change) return '0.0000';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(5)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden ${className}`}
    >
      {/* Header Chart */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">{instrument}</h3>
          </div>
          
          {currentPrice && (
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-white">
                {formatPrice(currentPrice)}
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium ${
                priceChange >= 0 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {priceChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4 rotate-180" />
                )}
                <span>{formatChange(priceChange)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Perbarui Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Pengaturan Chart"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        ref={chartContainerRef}
        className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900' : ''}`}
        style={{ 
          height: isFullscreen ? '100vh' : `${height}px`,
          paddingTop: isFullscreen ? '60px' : '0'
        }}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2 text-white">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Memperbarui data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Controls */}
      <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">
            Timeframe:
          </div>
          <div className="flex space-x-1">
            {['1M', '5M', '15M', '1H', '4H', '1D'].map((tf) => (
              <button
                key={tf}
                className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">
            Indikator:
          </div>
          <div className="flex space-x-1">
            {['MA', 'RSI', 'MACD', 'BB'].map((indicator) => (
              <button
                key={indicator}
                className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                {indicator}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen Close Button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-50 p-2 bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}
    </motion.div>
  );
};

export default TradingChart;