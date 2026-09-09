import { useState, useEffect } from 'react';
import { Heart, Calendar, Plus, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Timeline({ coupleId }) {
  const [memories, setMemories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemory, setNewMemory] = useState({ title: '', description: '', date: '' });

  useEffect(() => {
    if (!coupleId) return;

    const memoriesRef = collection(db, 'couples', coupleId, 'memories');
    const q = query(memoriesRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMemories(memoriesData);
    });

    return () => unsubscribe();
  }, [coupleId]);

  const addMemory = async (e) => {
    e.preventDefault();
    if (!newMemory.title || !coupleId) return;

    try {
      await addDoc(collection(db, 'couples', coupleId, 'memories'), {
        title: newMemory.title,
        description: newMemory.description,
        date: newMemory.date || new Date().toISOString(),
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid
      });
      setNewMemory({ title: '', description: '', date: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding memory:', error);
    }
  };

  const calculateDaysTogether = () => {
    if (memories.length === 0) return 0;
    const firstMemory = memories[memories.length - 1];
    const startDate = new Date(firstMemory.date);
    const today = new Date();
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-3 sm:p-4 pb-20 md:pb-4">
      <div className="max-w-2xl mx-auto">
        {/* Anniversary Counter */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-center"
        >
          <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-love-pink-dark mx-auto mb-3 sm:mb-4 animate-heartbeat" fill="#FF69B4" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gradient mb-2">Kita Sudah Bersama</h2>
          <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-love-pink-dark mb-2">{calculateDaysTogether()}</p>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">Hari penuh cinta</p>
        </motion.div>

        {/* Add Memory Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full love-button py-2 sm:py-3 mb-4 sm:mb-6 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Tambah Kenangan Baru
        </button>

        {/* Timeline */}
        <div className="space-y-3 sm:space-y-4">
          {memories.map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-xl sm:rounded-2xl p-3 sm:p-5 relative"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-love-pink to-love-purple rounded-l-xl sm:rounded-l-2xl" />
              <div className="pl-3 sm:pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-love-pink-dark" />
                  <span className="text-xs sm:text-sm text-gray-500">
                    {format(new Date(memory.date), 'dd MMMM yyyy', { locale: id })}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 mb-2">{memory.title}</h3>
                {memory.description && (
                  <p className="text-xs sm:text-sm md:text-base text-gray-600">{memory.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Memory Modal */}
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg sm:text-xl font-bold text-gradient mb-4">Tambah Kenangan</h3>
              <form onSubmit={addMemory} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Judul</label>
                  <input
                    type="text"
                    value={newMemory.title}
                    onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-pink-200 rounded-lg focus:outline-none focus:border-love-pink text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea
                    value={newMemory.description}
                    onChange={(e) => setNewMemory({ ...newMemory, description: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-pink-200 rounded-lg focus:outline-none focus:border-love-pink h-20 sm:h-24 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={newMemory.date}
                    onChange={(e) => setNewMemory({ ...newMemory, date: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-pink-200 rounded-lg focus:outline-none focus:border-love-pink text-sm sm:text-base"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 border border-pink-200 rounded-lg text-gray-600 hover:bg-pink-50 transition-colors text-sm sm:text-base"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 love-button py-2 text-sm sm:text-base"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
