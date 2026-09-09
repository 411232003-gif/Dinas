import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { db, auth } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';

export default function LoveNotificationBanner({ coupleId }) {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!coupleId || !auth.currentUser) return;

    const notificationsRef = collection(db, 'couples', coupleId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show notification if it's from another user and not read
          if (data.senderId !== auth.currentUser?.uid && !data.read) {
            setNotification({
              id: change.doc.id,
              text: data.text,
              senderName: data.senderName || 'Seseorang'
            });
            setIsVisible(true);

            // Mark as read after showing
            setTimeout(() => {
              updateDoc(doc(db, 'couples', coupleId, 'notifications', change.doc.id), {
                read: true
              });
            }, 5000);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [coupleId]);

  const handleClose = () => {
    setIsVisible(false);
    if (notification) {
      updateDoc(doc(db, 'couples', coupleId, 'notifications', notification.id), {
        read: true
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && notification && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 p-4"
        >
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm mb-1">
                    {notification.senderName} 💕
                  </p>
                  <p className="text-white/90 text-sm">
                    {notification.text}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
