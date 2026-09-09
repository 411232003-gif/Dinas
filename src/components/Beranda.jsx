import { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, MessageCircleHeart, Gift, Bell, Star, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Beranda.css';

export default function Beranda({ user, coupleId, onNavigateToFeature }) {
  const [profile, setProfile] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, [user, coupleId]);

  useEffect(() => {
    // Auto-play background music when component mounts
    if (audioRef.current) {
      audioRef.current.volume = 1.0; // Maximum volume
      audioRef.current.play().catch(error => {
        console.log('Audio autoplay was prevented:', error);
      });
    }
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const displayName = profile?.name || user?.displayName || 'Love';
  const features = [
    { id: 'chat', name: 'Private Chat', icon: MessageCircleHeart, color: 'bg-pink-500', desc: 'Chat eksklusif dengan love reactions' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'bg-orange-500', desc: 'Notifikasi love' },
    { id: 'wishlist', name: 'Wishlist Together', icon: Gift, color: 'bg-yellow-500', desc: 'Bucket list bersama' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex flex-col relative">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/background-music.mp3"
        loop
        autoPlay
      />
      {/* Animated Background Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {[...Array(15)].map((_, i) => {
            const icons = [Heart, Star, Moon];
            const Icon = icons[i % 3];
            const positions = [
              { top: '10%', left: '10%' },
              { top: '20%', left: '80%' },
              { top: '30%', left: '30%' },
              { top: '40%', left: '70%' },
              { top: '50%', left: '20%' },
              { top: '60%', left: '60%' },
              { top: '70%', left: '40%' },
              { top: '80%', left: '90%' },
              { top: '15%', left: '50%' },
              { top: '25%', left: '15%' },
              { top: '35%', left: '85%' },
              { top: '45%', left: '45%' },
              { top: '55%', left: '75%' },
              { top: '65%', left: '25%' },
              { top: '75%', left: '55%' },
            ];
            const pos = positions[i];
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, rotate: 0 }}
                animate={{
                  opacity: [0, 0.3, 0.6, 0.3, 0],
                  scale: [0, 1, 1.2, 1, 0],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 4 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
                className="absolute"
                style={{
                  top: pos.top,
                  left: pos.left,
                }}
              >
                <Icon 
                  className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 text-pink-300" 
                  fill="currentColor"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(255, 105, 180, 0.5))'
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden h-48 sm:h-56 md:h-64 lg:h-80 flex-shrink-0 z-10">
        {/* Neon Frame */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <motion.div
            className="absolute inset-0 border-6 border-pink-400 rounded-lg"
            style={{
              boxShadow: '0 0 30px #FF69B4, 0 0 60px #FF69B4, 0 0 90px #FF69B4, inset 0 0 30px #FF69B4',
              filter: 'brightness(2)'
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute inset-2 border-4 border-purple-400 rounded-lg"
            style={{
              boxShadow: '0 0 25px #9333EA, 0 0 50px #9333EA, 0 0 75px #9333EA, inset 0 0 25px #9333EA',
              filter: 'brightness(1.8)'
            }}
            animate={{
              rotate: [360, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>
        <div className="absolute inset-0 z-10">
          <motion.img
            src="/banner.png"
            alt="Banner"
            className="w-full h-auto object-cover"
            style={{ minHeight: '200%' }}
            animate={{
              y: [0, '-50%', 0]
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-pink-400/50 to-purple-500/50"></div>
        </div>
        <div className="relative px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 text-white h-full flex items-center z-30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center w-full"
          >
            <Heart className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 md:mb-6 animate-pulse" fill="white" />
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">
              Selamat Datang, {displayName}! 💕
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg opacity-90 mb-2 sm:mb-3 md:mb-4 lg:mb-6 px-2">
              Dalam riuh dan sunyinya dunia, kamu adalah satu-satunya tempat di mana aku selalu ingin pulang.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features Preview - 3D Social Media Hover Buttons */}
      <div className="flex-1 px-3 sm:px-4 md:px-6 py-8 sm:py-10 md:py-12 z-10 flex items-center min-h-0">
        <ul className="beranda-3d-list w-full max-w-3xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.li
                key={feature.id}
                className="beranda-3d-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <button
                  type="button"
                  className="beranda-3d-button"
                  onClick={() => onNavigateToFeature(feature.id)}
                >
                  <span className="icon-box">
                    <Icon />
                  </span>
                  <span className="label">{feature.name}</span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Love Quote - Fixed at bottom above navigation */}
      <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 pb-24 flex-shrink-0 z-10">
        <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 text-center">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mx-auto mb-1 sm:mb-1.5 md:mb-2 text-pink-500" fill="#FF69B4" />
          <p className="text-gray-700 italic text-[10px] sm:text-xs md:text-sm lg:text-base px-2">
            "Cinta bukan tentang berapa banyak yang kita katakan 'I love you', tapi berapa banyak yang kita buktikan."
          </p>
        </div>
      </div>
    </div>
  );
}
