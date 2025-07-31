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
  Activity,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';

export default function Beranda() {
  const { isSignedIn, user } = useUser();
  const [statistik, setStatistik] = useState({
    totalPengguna: 0,
    totalTrade: 0,
    tingkatSukses: 0,
    totalKeuntungan: 0
  });

  useEffect(() => {
    // Simulasi loading statistik
    const timer = setTimeout(() => {
      setStatistik({
        totalPengguna: 15847,
        totalTrade: 3247392,
        tingkatSukses: 92.4,
        totalKeuntungan: 4847392
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const fitur = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "Trading Otomatis dengan AI",
      description: "Algoritma canggih menganalisis pola pasar dan menjalankan trade dengan presisi tinggi"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Analisis Visual MT5",
      description: "Interface trading visual yang menakjubkan dengan chart MT5 profesional"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Manajemen Risiko Canggih",
      description: "Sistem proteksi otomatis dengan stop loss dan take profit yang cerdas"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Eksekusi Real-time OANDA",
      description: "Koneksi langsung ke OANDA dengan eksekusi order super cepat"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Backtesting Akurat",
      description: "Uji strategi trading Anda dengan data historis yang komprehensif"
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: "Monitoring Real-time",
      description: "Pantau performa trading Anda secara real-time dengan dashboard interaktif"
    }
  ];

  const strategiTrading = [
    {
      nama: "Scalping Pro",
      deskripsi: "Strategi trading cepat untuk profit harian konsisten",
      winRate: "89%",
      profitBulanan: "12-18%"
    },
    {
      nama: "Grid Trading",
      deskripsi: "Manfaatkan volatilitas pasar dengan sistem grid otomatis",
      winRate: "85%", 
      profitBulanan: "8-15%"
    },
    {
      nama: "Trend Following",
      deskripsi: "Ikuti tren pasar jangka panjang dengan akurasi tinggi",
      winRate: "78%",
      profitBulanan: "15-25%"
    }
  ];

  const testimoni = [
    {
      nama: "Budi Santoso",
      profesi: "Trader Profesional",
      komentar: "Platform terbaik yang pernah saya gunakan! Profit konsisten setiap bulan dengan OANDA MT5.",
      rating: 5,
      profit: "+285%"
    },
    {
      nama: "Sari Dewi",
      profesi: "Ibu Rumah Tangga",
      komentar: "Mudah digunakan bahkan untuk pemula. Interface Indonesia membantu sekali!",
      rating: 5,
      profit: "+156%"
    },
    {
      nama: "Ahmad Rizki",
      profesi: "Karyawan Swasta", 
      komentar: "Backtesting yang akurat membantu saya memilih strategi terbaik. Highly recommended!",
      rating: 5,
      profit: "+198%"
    }
  ];

  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-white mb-4">
              Selamat Datang Kembali, {user?.firstName}!
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Siap untuk melanjutkan trading dengan OANDA MT5?
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Buka Dashboard Trading
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="container mx-auto px-6 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Platform Trading
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> OANDA MT5 </span>
                Terdepan di Indonesia
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Rasakan pengalaman trading forex yang revolusioner dengan teknologi AI, 
                interface visual yang menawan, dan integrasi langsung dengan OANDA MT5. 
                Cocok untuk pemula hingga trader profesional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <SignUpButton mode="modal">
                  <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center">
                    Mulai Trading Gratis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300">
                    Masuk ke Akun
                  </button>
                </SignInButton>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-6">Statistik Platform</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {statistik.totalPengguna.toLocaleString('id-ID')}+
                    </div>
                    <div className="text-gray-300">Trader Aktif</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {statistik.totalTrade.toLocaleString('id-ID')}+
                    </div>
                    <div className="text-gray-300">Trade Sukses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {statistik.tingkatSukses}%
                    </div>
                    <div className="text-gray-300">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">
                      ${statistik.totalKeuntungan.toLocaleString('id-ID')}
                    </div>
                    <div className="text-gray-300">Total Profit</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Fitur Utama */}
      <section className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Fitur Unggulan Platform
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Dilengkapi dengan teknologi terdepan untuk memberikan pengalaman trading terbaik
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {fitur.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-blue-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20"
              >
                <div className="text-blue-400 mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategi Trading */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Strategi Trading Teruji
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Pilih strategi yang sesuai dengan gaya trading dan target profit Anda
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {strategiTrading.map((strategi, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 hover:border-blue-400/50 transition-all duration-300"
              >
                <h3 className="text-2xl font-bold text-white mb-3">{strategi.nama}</h3>
                <p className="text-gray-300 mb-6">{strategi.deskripsi}</p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="text-green-400 font-semibold">{strategi.winRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Profit/Bulan:</span>
                    <span className="text-blue-400 font-semibold">{strategi.profitBulanan}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimoni */}
      <section className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Apa Kata Trader Indonesia
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Ribuan trader telah merasakan keuntungan dari platform kami
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimoni.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <span className="ml-2 text-green-400 font-semibold">{item.profit}</span>
                </div>
                <p className="text-gray-300 mb-4 italic">"{item.komentar}"</p>
                <div>
                  <div className="font-semibold text-white">{item.nama}</div>
                  <div className="text-gray-400 text-sm">{item.profesi}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsive Design Showcase */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Trading Di Mana Saja, Kapan Saja
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Platform responsif yang sempurna di desktop, tablet, dan mobile
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/20"
            >
              <Monitor className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Desktop</h3>
              <p className="text-gray-300">Interface lengkap dengan semua fitur advanced trading</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/20"
            >
              <Smartphone className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Mobile</h3>
              <p className="text-gray-300">Trading on-the-go dengan interface yang dioptimalkan</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/20"
            >
              <Globe className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Web-Based</h3>
              <p className="text-gray-300">Akses langsung dari browser tanpa instalasi</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Siap Memulai Perjalanan Trading Anda?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Bergabunglah dengan ribuan trader sukses yang telah merasakan keuntungan 
              dari platform OANDA MT5 terbaik di Indonesia
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignUpButton mode="modal">
                <button className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center">
                  Daftar Sekarang - GRATIS
                  <ArrowRight className="ml-2 w-5 h-5" />
                </button>
              </SignUpButton>
              <button className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300">
                Demo Trading
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Platform Trading OANDA</h3>
              <p className="text-gray-400">
                Platform trading forex terdepan dengan teknologi MT5 dan AI untuk trader Indonesia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Fitur</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Trading Otomatis</li>
                <li>Analisis Visual</li>
                <li>Backtesting</li>
                <li>Risk Management</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Dukungan</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Panduan Trading</li>
                <li>Video Tutorial</li>
                <li>Customer Support</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Kontak</h4>
              <ul className="space-y-2 text-gray-400">
                <li>support@tradingplatform.id</li>
                <li>+62 21 1234 5678</li>
                <li>Jakarta, Indonesia</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Platform Trading OANDA MT5. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
