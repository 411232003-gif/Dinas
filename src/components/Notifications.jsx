import { useState, useEffect } from 'react';
import { Heart, Sun, Moon, Coffee, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function Notifications({ coupleId, onBack }) {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Load user name from Firestore
    const loadUserName = async () => {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || auth.currentUser?.displayName || 'Anonymous');
        } else {
          setUserName(auth.currentUser?.displayName || 'Anonymous');
        }
      } catch (error) {
        console.error('Error loading user name:', error);
        setUserName(auth.currentUser?.displayName || 'Anonymous');
      }
    };

    loadUserName();
  }, []);

  const loveMessages = [
    { id: 'morning', text: 'Selamat pagi sayang! Semoga harimu indah seperti senyumanmu ❤️', icon: Sun, color: 'from-yellow-400 to-orange-400' },
    { id: 'night', text: 'Selamat malam sayang! Mimpi indah tentang kita ya 🌙', icon: Moon, color: 'from-indigo-400 to-purple-400' },
    { id: 'miss', text: 'Aku rindu kamu! Ingin segera bertemu 💕', icon: Heart, color: 'from-pink-400 to-red-400' },
    { id: 'coffee', text: 'Coffee time! Aku wish kamu di sini ☕', icon: Coffee, color: 'from-amber-400 to-yellow-400' },
    { id: 'love', text: 'Aku sayang kamu! Selamanya 💖', icon: Sparkles, color: 'from-pink-500 to-purple-500' },
    { id: 'thinking', text: 'Aku sedang memikirkanmu 🥰', icon: MessageCircle, color: 'from-blue-400 to-cyan-400' },
  ];

  const sendLoveNotification = async (message) => {
    if (!coupleId) return;

    try {
      await addDoc(collection(db, 'couples', coupleId, 'notifications'), {
        text: message.text,
        senderId: auth.currentUser?.uid,
        senderName: userName,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error sending love notification:', error);
    }
  };

  return (
    <div className="p-4 pb-20 md:pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with Back Button */}
        {onBack && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium text-sm">Kembali</span>
            </button>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-6 h-6 text-love-pink-dark" />
            <h3 className="text-lg font-semibold text-gradient">Kirim Pesan Cinta</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loveMessages.map((msg, index) => (
              <motion.button
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => sendLoveNotification(msg)}
                className={`p-4 rounded-xl bg-gradient-to-r ${msg.color} text-white hover:shadow-lg transition-all hover:scale-105 text-left`}
              >
                <div className="flex items-start gap-3">
                  <msg.icon className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-sm">{msg.text}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-4 bg-gradient-to-r from-blue-50 to-purple-50"
        >
          <p className="text-sm text-gray-600 text-center">
            💕 Pesan akan muncul sebagai banner di layar pasanganmu di halaman manapun!
          </p>
        </motion.div>
      </div>
    </div>
  );
}
