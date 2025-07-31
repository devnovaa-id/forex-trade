'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { 
  Check, 
  Crown, 
  Zap, 
  Shield, 
  BarChart3, 
  Bot,
  TrendingUp,
  Star,
  MessageCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Subscription() {
  const { user } = useUser();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const plans = {
    monthly: {
      name: 'Premium Bulanan',
      price: 299000,
      period: 'per bulan',
      duration: '1 bulan',
      savings: null,
      popular: false
    },
    yearly: {
      name: 'Premium Tahunan',
      price: 2390000,
      period: 'per tahun',
      duration: '12 bulan',
      savings: 'Hemat Rp 1.198.000',
      popular: true
    }
  };

  const features = [
    {
      icon: <Bot className="w-5 h-5" />,
      title: 'Scalping Bot Profesional',
      description: 'Algoritma scalping dengan winrate tinggi 85%+'
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'Visual Trading MT5',
      description: 'Chart profesional dengan 80+ indikator teknis'
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'Data Real-time OANDA',
      description: 'Koneksi langsung ke server OANDA tanpa delay'
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Risk Management Canggih',
      description: 'Sistem proteksi otomatis dengan SL/TP dinamis'
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Backtesting Akurat',
      description: 'Test strategi dengan data historis 10+ tahun'
    },
    {
      icon: <Crown className="w-5 h-5" />,
      title: 'Support Premium 24/7',
      description: 'Dukungan teknis dan konsultasi trading'
    }
  ];

  const testimonials = [
    {
      name: 'Ahmad Rizki',
      role: 'Day Trader',
      image: '/avatars/ahmad.jpg',
      content: 'Profit konsisten 15-20% per bulan dengan scalping bot ini. Worth every penny!',
      profit: '+387%'
    },
    {
      name: 'Sari Dewi',
      role: 'Swing Trader', 
      image: '/avatars/sari.jpg',
      content: 'Interface yang mudah dipahami, bahkan untuk pemula seperti saya.',
      profit: '+156%'
    },
    {
      name: 'Budi Santoso',
      role: 'Professional Trader',
      image: '/avatars/budi.jpg',
      content: 'Backtesting yang akurat membantu saya optimize strategi trading.',
      profit: '+298%'
    }
  ];

  const handleSelectPlan = (planType) => {
    setSelectedPlan(planType);
  };

  const handleSubscribe = () => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      return;
    }

    setIsProcessing(true);
    
    const plan = plans[selectedPlan];
    const userInfo = {
      name: `${user.firstName} ${user.lastName}`,
      email: user.emailAddresses[0]?.emailAddress,
      userId: user.id
    };

    // Format pesan WhatsApp
    const message = encodeURIComponent(
      `🚀 *PEMESANAN PREMIUM PLATFORM TRADING OANDA MT5*\n\n` +
      `👤 *Data Customer:*\n` +
      `• Nama: ${userInfo.name}\n` +
      `• Email: ${userInfo.email}\n` +
      `• User ID: ${userInfo.userId}\n\n` +
      `📦 *Paket yang Dipilih:*\n` +
      `• ${plan.name}\n` +
      `• Harga: Rp ${plan.price.toLocaleString('id-ID')}\n` +
      `• Durasi: ${plan.duration}\n` +
      `${plan.savings ? `• ${plan.savings}\n` : ''}` +
      `\n🎯 *Fitur Premium:*\n` +
      `• Scalping Bot Profesional (85%+ winrate)\n` +
      `• Visual Trading MT5 dengan 80+ indikator\n` +
      `• Data real-time OANDA tanpa delay\n` +
      `• Risk management canggih\n` +
      `• Backtesting akurat 10+ tahun data\n` +
      `• Support premium 24/7\n\n` +
      `💳 *Metode Pembayaran:*\n` +
      `• Transfer Bank\n` +
      `• E-Wallet (Dana, OVO, Gopay)\n` +
      `• QRIS\n\n` +
      `⏰ Mohon diproses segera. Terima kasih!`
    );

    // Redirect ke WhatsApp
    const whatsappUrl = `https://wa.me/6285134205152?text=${message}`;
    
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
      setIsProcessing(false);
      toast.success('Redirecting to WhatsApp...');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full px-4 py-2 mb-6">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">Premium Access Required</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">
            Upgrade ke
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"> Premium </span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Akses penuh ke platform trading OANDA MT5 dengan scalping bot profesional, 
            data real-time, dan fitur premium lainnya untuk maksimalkan profit trading Anda.
          </p>
        </motion.div>

        {/* Pricing Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16"
        >
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              className={`relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border-2 transition-all duration-300 cursor-pointer ${
                selectedPlan === key
                  ? 'border-yellow-400 shadow-xl shadow-yellow-400/20'
                  : 'border-slate-700 hover:border-slate-600'
              } ${plan.popular ? 'ring-2 ring-yellow-400/50' : ''}`}
              onClick={() => handleSelectPlan(key)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>PALING POPULER</span>
                  </div>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">
                    Rp {plan.price.toLocaleString('id-ID')}
                  </span>
                  <span className="text-gray-400 ml-2">{plan.period}</span>
                </div>

                {plan.savings && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-1 mb-4">
                    <span className="text-green-400 text-sm font-medium">{plan.savings}</span>
                  </div>
                )}

                <div className="text-gray-300 mb-6">
                  Akses premium selama {plan.duration}
                </div>

                <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                  selectedPlan === key
                    ? 'bg-yellow-400 border-yellow-400'
                    : 'border-gray-400'
                }`} />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Fitur Premium yang Akan Anda Dapatkan
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-400 p-2 rounded-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Apa Kata Member Premium Kami
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-slate-900 font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-gray-400 text-sm">{testimonial.role}</div>
                  </div>
                  <div className="ml-auto text-green-400 font-bold text-sm">
                    {testimonial.profit}
                  </div>
                </div>
                <p className="text-gray-300 italic">"{testimonial.content}"</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <h3 className="text-2xl font-bold text-white">Siap Memulai Trading Premium?</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              Bergabunglah dengan ribuan trader sukses yang sudah merasakan keuntungan 
              dari platform premium kami. Investasi terbaik untuk masa depan trading Anda!
            </p>

            <div className="space-y-4">
              <button
                onClick={handleSubscribe}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 font-bold py-4 px-8 rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    <span>Pesan via WhatsApp</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Aktivasi Instan</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Garansi 30 Hari</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4 text-purple-400" />
                  <span>Support 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}