import { useState } from 'react';
import { MessageCircleHeart, Calendar, Heart, Gift, Gamepad2, BarChart3, Bell, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Chat from './Chat';
import Timeline from './Timeline';
import LoveNotes from './LoveNotes';
import Wishlist from './Wishlist';
import Games from './Games';
import IntimacyMeter from './IntimacyMeter';
import Notifications from './Notifications';

export default function Fitur({ coupleId, onBack }) {
  const [activeFeature, setActiveFeature] = useState(null);

  const features = [
    { id: 'chat', name: 'Private Chat', icon: MessageCircleHeart, color: 'bg-pink-500', desc: 'Chat eksklusif dengan love reactions, voice messages, dan photo sharing' },
    { id: 'timeline', name: 'Love Timeline', icon: Calendar, color: 'bg-purple-500', desc: 'Timeline momen spesial dengan anniversary counter' },
    { id: 'notes', name: 'Daily Love Notes', icon: Heart, color: 'bg-red-500', desc: 'Pesan romantis harian dengan love quotes otomatis' },
    { id: 'wishlist', name: 'Wishlist Together', icon: Gift, color: 'bg-yellow-500', desc: 'Bucket list bersama yang bisa dicapai bersama' },
    { id: 'games', name: 'Love Games', icon: Gamepad2, color: 'bg-green-500', desc: 'Mini games romantis untuk lebih mengenal pasangan' },
    { id: 'stats', name: 'Intimacy Meter', icon: BarChart3, color: 'bg-blue-500', desc: 'Indikator koneksi dengan love score' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'bg-orange-500', desc: 'Notifikasi dan love reminders' },
  ];

  const renderFeature = (featureId) => {
    switch (featureId) {
      case 'chat':
        return <Chat coupleId={coupleId} />;
      case 'timeline':
        return <Timeline coupleId={coupleId} />;
      case 'notes':
        return <LoveNotes coupleId={coupleId} />;
      case 'wishlist':
        return <Wishlist coupleId={coupleId} />;
      case 'games':
        return <Games />;
      case 'stats':
        return <IntimacyMeter coupleId={coupleId} />;
      case 'notifications':
        return <Notifications coupleId={coupleId} />;
      default:
        return null;
    }
  };

  if (activeFeature) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 pb-24">
        <div className="px-6 py-4">
          <button
            onClick={() => setActiveFeature(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali ke Fitur</span>
          </button>
          {renderFeature(activeFeature)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 pb-24">
      <div className="px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            <Heart className="inline w-8 h-8 mr-2 text-pink-500" fill="#FF69B4" />
            Semua Fitur
          </h1>
          <p className="text-gray-600 text-center mb-8">Pilih fitur romantis untuk Anda dan pasangan</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveFeature(feature.id)}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg cursor-pointer transition-all hover:scale-105"
              >
                <div className={`${feature.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-lg">{feature.name}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
