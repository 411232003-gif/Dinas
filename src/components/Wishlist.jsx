import { useState, useEffect } from 'react';
import { Plus, Check, MapPin, Plane, Heart, Star, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

export default function Wishlist({ coupleId, onBack }) {
  const [wishes, setWishes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWish, setNewWish] = useState({ title: '', category: 'place', priority: 'medium' });

  const categories = [
    { id: 'place', icon: MapPin, label: 'Tempat', color: 'text-blue-500' },
    { id: 'travel', icon: Plane, label: 'Travel', color: 'text-green-500' },
    { id: 'activity', icon: Heart, label: 'Aktivitas', color: 'text-pink-500' },
    { id: 'experience', icon: Star, label: 'Pengalaman', color: 'text-yellow-500' },
  ];

  useEffect(() => {
    if (!coupleId) return;

    const wishesRef = collection(db, 'couples', coupleId, 'wishlist');
    const q = query(wishesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wishesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWishes(wishesData);
    });

    return () => unsubscribe();
  }, [coupleId]);

  const addWish = async (e) => {
    e.preventDefault();
    if (!newWish.title || !coupleId) return;

    try {
      await addDoc(collection(db, 'couples', coupleId, 'wishlist'), {
        title: newWish.title,
        category: newWish.category,
        priority: newWish.priority,
        completed: false,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid
      });
      setNewWish({ title: '', category: 'place', priority: 'medium' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding wish:', error);
    }
  };

  const toggleComplete = async (wishId, currentStatus) => {
    try {
      const wishRef = doc(db, 'couples', coupleId, 'wishlist', wishId);
      await updateDoc(wishRef, { completed: !currentStatus });
    } catch (error) {
      console.error('Error updating wish:', error);
    }
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    const Icon = category?.icon || Heart;
    return <Icon className={`w-5 h-5 ${category?.color || 'text-gray-500'}`} />;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const completedCount = wishes.filter(w => w.completed).length;
  const progress = wishes.length > 0 ? (completedCount / wishes.length) * 100 : 0;

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
        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gradient">Progress Wishlist</h3>
            <span className="text-sm text-gray-500">{completedCount}/{wishes.length} Selesai</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-love-pink to-love-purple h-3 rounded-full"
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">{progress.toFixed(0)}% tercapai</p>
        </motion.div>

        {/* Add Wish Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full love-button py-3 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Wishlist Baru
        </button>

        {/* Wishlist Items */}
        <div className="space-y-3">
          {wishes.map((wish) => (
            <motion.div
              key={wish.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`glass-card rounded-xl p-4 flex items-center gap-4 ${
                wish.completed ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => toggleComplete(wish.id, wish.completed)}
                className={`p-2 rounded-full border-2 transition-all ${
                  wish.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-love-pink'
                }`}
              >
                <Check className="w-5 h-5" />
              </button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getCategoryIcon(wish.category)}
                  <h4 className={`font-semibold ${wish.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {wish.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(wish.priority)}`}>
                    {wish.priority}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Wish Modal */}
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gradient mb-4">Tambah Wishlist</h3>
              <form onSubmit={addWish} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                  <input
                    type="text"
                    value={newWish.title}
                    onChange={(e) => setNewWish({ ...newWish, title: e.target.value })}
                    className="w-full px-4 py-2 border border-pink-200 rounded-lg focus:outline-none focus:border-love-pink"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={newWish.category}
                    onChange={(e) => setNewWish({ ...newWish, category: e.target.value })}
                    className="w-full px-4 py-2 border border-pink-200 rounded-lg focus:outline-none focus:border-love-pink"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
                  <select
                    value={newWish.priority}
                    onChange={(e) => setNewWish({ ...newWish, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-pink-200 rounded-lg focus:outline-none focus:border-love-pink"
                  >
                    <option value="high">Tinggi</option>
                    <option value="medium">Sedang</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 border border-pink-200 rounded-lg text-gray-600 hover:bg-pink-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 love-button py-2"
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
