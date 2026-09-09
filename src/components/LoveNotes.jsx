import { useState, useEffect } from 'react';
import { Heart, Sun, Moon, Coffee, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const loveQuotes = [
  "Cinta bukan tentang siapa yang paling lama bersama, tapi tentang siapa yang tidak pernah pergi.",
  "Setiap detik bersamamu adalah anugerah terindah yang pernah aku terima.",
  "Kamu adalah alasan aku tersenyum setiap hari.",
  "Dalam matamu, aku menemukan rumahku.",
  "Cinta kita adalah cerita terbaik yang pernah aku tulis.",
  "Terima kasih telah menjadi bagian terindah dalam hidupku.",
  "Aku mencintaimu lebih dari kata-kata bisa ungkapkan.",
  "Bersamamu, setiap momen menjadi istimewa.",
];

export default function LoveNotes({ coupleId }) {
  const [dailyNote, setDailyNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [selectedTime, setSelectedTime] = useState('morning');
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

  useEffect(() => {
    if (!coupleId) return;

    const notesRef = collection(db, 'couples', coupleId, 'loveNotes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(notesData);
    });

    return () => unsubscribe();
  }, [coupleId]);

  const sendLoveNote = async (type) => {
    if (!coupleId) return;

    try {
      const messages = {
        morning: "Selamat pagi sayang! Semoga harimu indah seperti senyumanmu ❤️",
        night: "Selamat malam sayang! Mimpi indah tentang kita ya 🌙",
        miss: "Aku rindu kamu! Ingin segera bertemu 💕",
        coffee: "Coffee time! Aku wish kamu di sini ☕"
      };

      await addDoc(collection(db, 'couples', coupleId, 'messages'), {
        text: messages[type],
        senderId: auth.currentUser?.uid,
        senderName: userName,
        createdAt: serverTimestamp(),
        type: 'love_note'
      });
    } catch (error) {
      console.error('Error sending love note:', error);
    }
  };

  const todayQuote = loveQuotes[new Date().getDay()] || loveQuotes[0];

  return (
    <div className="p-3 sm:p-4 pb-20 md:pb-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Daily Quote */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-love-pink to-love-purple" />
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-love-gold mx-auto mb-2 sm:mb-3 animate-float" />
          <h3 className="text-base sm:text-lg font-semibold text-gradient mb-2">Quote Hari Ini</h3>
          <p className="text-xs sm:text-sm md:text-base text-gray-700 italic px-2">"{todayQuote}"</p>
        </motion.div>

        {/* Quick Love Notes */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendLoveNote('morning')}
            className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover:bg-gradient-to-br hover:from-yellow-50 hover:to-orange-50 transition-all"
          >
            <Sun className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mx-auto mb-1 sm:mb-2" />
            <p className="font-semibold text-gray-800 text-xs sm:text-sm">Good Morning</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Mulai hari dengan cinta</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendLoveNote('night')}
            className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all"
          >
            <Moon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 mx-auto mb-1 sm:mb-2" />
            <p className="font-semibold text-gray-800 text-xs sm:text-sm">Good Night</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Tidur dengan bahagia</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendLoveNote('miss')}
            className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover:bg-gradient-to-br hover:from-pink-50 hover:to-red-50 transition-all"
          >
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-love-pink-dark mx-auto mb-1 sm:mb-2 animate-heartbeat" fill="#FF69B4" />
            <p className="font-semibold text-gray-800 text-xs sm:text-sm">I Miss You</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Kirim rindu</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendLoveNote('coffee')}
            className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover:bg-gradient-to-br hover:from-amber-50 hover:to-yellow-50 transition-all"
          >
            <Coffee className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 mx-auto mb-1 sm:mb-2" />
            <p className="font-semibold text-gray-800 text-xs sm:text-sm">Coffee Time</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Ngopi yuk!</p>
          </motion.button>
        </div>

        {/* Custom Love Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6"
        >
          <h3 className="text-base sm:text-lg font-semibold text-gradient mb-3 sm:mb-4">Tulis Catatan Cinta</h3>
          <textarea
            value={dailyNote}
            onChange={(e) => setDailyNote(e.target.value)}
            placeholder="Tulis sesuatu yang manis untuk pasanganmu..."
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-pink-200 rounded-xl focus:outline-none focus:border-love-pink focus:ring-2 focus:ring-love-pink/20 h-24 sm:h-32 resize-none text-sm sm:text-base"
          />
          <button
            onClick={async () => {
              if (!dailyNote.trim() || !coupleId) return;
              try {
                await addDoc(collection(db, 'couples', coupleId, 'messages'), {
                  text: dailyNote,
                  senderId: auth.currentUser?.uid,
                  senderName: userName,
                  createdAt: serverTimestamp(),
                  type: 'custom_note'
                });
                setDailyNote('');
              } catch (error) {
                console.error('Error sending custom note:', error);
              }
            }}
            className="w-full love-button py-2 sm:py-3 mt-3 sm:mt-4 text-sm sm:text-base"
          >
            Kirim Catatan Cinta
          </button>
        </motion.div>

        {/* Recent Love Notes */}
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-base sm:text-lg font-semibold text-gradient">Catatan Terkirim</h3>
          {notes.slice(0, 5).map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-xl p-3 sm:p-4"
            >
              <p className="text-xs sm:text-sm md:text-base text-gray-700">{note.text}</p>
              <span className="text-[10px] sm:text-xs text-gray-500 mt-2 block">
                {note.senderName} • {new Date(note.createdAt?.toDate()).toLocaleDateString('id-ID')}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
