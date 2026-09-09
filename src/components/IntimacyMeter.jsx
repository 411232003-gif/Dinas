import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Clock, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';

export default function IntimacyMeter({ coupleId }) {
  const [stats, setStats] = useState({
    totalMessages: 0,
    weeklyMessages: 0,
    avgResponseTime: 0,
    loveScore: 0,
    activeDays: 0
  });

  useEffect(() => {
    if (!coupleId) return;

    const messagesRef = collection(db, 'couples', coupleId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate stats
      const totalMessages = messages.length;
      
      // Weekly messages (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyMessages = messages.filter(m => {
        const msgDate = m.createdAt?.toDate();
        return msgDate && msgDate >= weekAgo;
      }).length;

      // Active days (unique days with messages)
      const activeDaysSet = new Set();
      messages.forEach(m => {
        const msgDate = m.createdAt?.toDate();
        if (msgDate) {
          activeDaysSet.add(msgDate.toDateString());
        }
      });

      // Calculate love score (0-100)
      const loveScore = Math.min(100, Math.round(
        (weeklyMessages * 2) + 
        (activeDaysSet.size * 5) + 
        (totalMessages * 0.1)
      ));

      setStats({
        totalMessages,
        weeklyMessages,
        avgResponseTime: 0, // Would need more complex logic
        loveScore,
        activeDays: activeDaysSet.size
      });
    });

    return () => unsubscribe();
  }, [coupleId]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'from-green-400 to-emerald-500';
    if (score >= 60) return 'from-love-pink to-love-purple';
    if (score >= 40) return 'from-yellow-400 to-orange-500';
    return 'from-gray-400 to-gray-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Sangat Romantis! 🔥';
    if (score >= 60) return 'Romantis 💕';
    if (score >= 40) return 'Cukup Romantis 💗';
    return 'Perlu Lebih Banyak Cinta 💔';
  };

  return (
    <div className="p-4 pb-20 md:pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Love Score Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 text-center"
        >
          <Heart className="w-12 h-12 text-love-pink-dark mx-auto mb-4 animate-heartbeat" fill="#FF69B4" />
          <h2 className="text-2xl font-bold text-gradient mb-2">Love Score</h2>
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="#e5e7eb"
                strokeWidth="12"
                fill="none"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: 440 }}
                animate={{ strokeDashoffset: 440 - (440 * stats.loveScore) / 100 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF69B4" />
                  <stop offset="100%" stopColor="#9370DB" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-gradient">{stats.loveScore}</span>
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-800">{getScoreLabel(stats.loveScore)}</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-xl p-4"
          >
            <MessageCircle className="w-8 h-8 text-love-pink-dark mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.totalMessages}</p>
            <p className="text-sm text-gray-500">Total Pesan</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-xl p-4"
          >
            <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.weeklyMessages}</p>
            <p className="text-sm text-gray-500">Pesan Minggu Ini</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-4"
          >
            <Clock className="w-8 h-8 text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800">{stats.activeDays}</p>
            <p className="text-sm text-gray-500">Hari Aktif</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-4"
          >
            <Award className="w-8 h-8 text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800">
              {stats.weeklyMessages > 50 ? '🔥' : stats.weeklyMessages > 20 ? '💕' : '💗'}
            </p>
            <p className="text-sm text-gray-500">Status Mingguan</p>
          </motion.div>
        </div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-gradient mb-4">Tips untuk Meningkatkan Koneksi</h3>
          <ul className="space-y-3">
            {stats.weeklyMessages < 20 && (
              <li className="flex items-start gap-2">
                <span className="text-love-pink-dark">💡</span>
                <span className="text-gray-700">Kirim lebih banyak pesan untuk meningkatkan komunikasi</span>
              </li>
            )}
            {stats.loveScore < 60 && (
              <li className="flex items-start gap-2">
                <span className="text-love-pink-dark">💡</span>
                <span className="text-gray-700">Coba fitur Love Notes untuk mengirim pesan romantis</span>
              </li>
            )}
            {stats.activeDays < 5 && (
              <li className="flex items-start gap-2">
                <span className="text-love-pink-dark">💡</span>
                <span className="text-gray-700">Usahakan chat setiap hari untuk menjaga koneksi</span>
              </li>
            )}
            {stats.weeklyMessages >= 20 && stats.loveScore >= 60 && (
              <li className="flex items-start gap-2">
                <span className="text-green-500">✨</span>
                <span className="text-gray-700">Kerja bagus! Terus pertahankan koneksi yang hangat</span>
              </li>
            )}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
