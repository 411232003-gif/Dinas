import { useState, useEffect } from 'react';
import { User, Heart, Mail, Calendar, MapPin, Edit2, Save, X, LogOut, Camera, Share2, Copy, Check, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { QRCodeSVG } from 'qrcode.react';

export default function Profile({ user, coupleId, onLogout, onCoupleIdChange }) {
  const [profile, setProfile] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    bio: '',
    location: '',
    birthday: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actualCoupleId, setActualCoupleId] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [user, coupleId]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      // Load user profile
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let userProfile;
      if (userDoc.exists()) {
        userProfile = userDoc.data();
        setProfile(userProfile);
      } else {
        // Create default profile
        const defaultProfile = {
          uid: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email,
          photoURL: user.photoURL,
          bio: 'Belum ada bio',
          location: 'Indonesia',
          birthday: '',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, defaultProfile);
        userProfile = defaultProfile;
        setProfile(defaultProfile);
      }

      // Check if user already has a coupleId
      if (userProfile.coupleId) {
        setActualCoupleId(userProfile.coupleId);
        onCoupleIdChange(userProfile.coupleId);
        
        // Load partner profile
        if (userProfile.partnerId) {
          const partnerDocRef = doc(db, 'users', userProfile.partnerId);
          const partnerDoc = await getDoc(partnerDocRef);
          if (partnerDoc.exists()) {
            setPartnerProfile(partnerDoc.data());
          }
        }
      } else {
        // Create a new couple for this user
        const newCoupleId = `${user.uid}_${Date.now()}`;
        await updateDoc(userDocRef, {
          coupleId: newCoupleId,
          isCreator: true
        });
        setActualCoupleId(newCoupleId);
        onCoupleIdChange(newCoupleId);
        
        // Create couple document
        await setDoc(doc(db, 'couples', newCoupleId), {
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          partnerId: null
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleEdit = () => {
    setEditData({
      name: profile?.name || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      birthday: profile?.birthday || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: editData.name,
        bio: editData.bio,
        location: editData.location,
        birthday: editData.birthday
      });
      
      setProfile({
        ...profile,
        ...editData
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 300x300 for Base64 to keep size manageable)
          const maxWidth = 300;
          const maxHeight = 300;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.6 quality and convert to Base64
          const base64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(base64);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);

    try {
      console.log('Starting photo upload...');
      
      // Compress image and convert to Base64
      console.log('Compressing image to Base64...');
      const base64Photo = await compressImageToBase64(file);
      console.log('Image compressed to Base64, length:', base64Photo.length, 'characters');
      
      // Update the profile with the Base64 photo directly in Firestore
      console.log('Updating Firestore with Base64 photo...');
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        photoURL: base64Photo
      });
      console.log('Firestore updated');
      
      setProfile({
        ...profile,
        photoURL: base64Photo
      });
      console.log('Profile state updated');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(`Gagal mengupload foto: ${error.message}. Silakan coba lagi.`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/invite/${actualCoupleId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex items-center justify-center pb-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
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
          className="max-w-2xl mx-auto"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            <Heart className="inline w-8 h-8 mr-2 text-pink-500" fill="#FF69B4" />
            Profile
          </h1>

          {/* Profile Card */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-6">
            {/* Cover Image */}
            <div className="h-32 bg-gradient-to-r from-pink-400 to-purple-500"></div>
            
            {/* Profile Info */}
            <div className="px-6 pb-6">
              <div className="flex items-end -mt-12 mb-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-pink-500 rounded-full p-2 cursor-pointer hover:bg-pink-600 transition-colors shadow-lg">
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="text-xl font-bold text-gray-800 border-b-2 border-pink-300 focus:outline-none focus:border-pink-500 w-full"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
                  )}
                  <p className="text-gray-500 text-sm">{profile.email}</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="p-2 bg-pink-100 rounded-full hover:bg-pink-200 transition-colors"
                  >
                    <Edit2 className="w-5 h-5 text-pink-600" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="p-2 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                    >
                      <Save className="w-5 h-5 text-green-600" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-2 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                    >
                      <X className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Bio</label>
                {isEditing ? (
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 resize-none"
                    rows="3"
                  />
                ) : (
                  <p className="text-gray-700 bg-pink-50 p-3 rounded-xl">{profile.bio}</p>
                )}
              </div>

              {/* Location */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  Lokasi
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                ) : (
                  <p className="text-gray-700">{profile.location}</p>
                )}
              </div>

              {/* Birthday */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Ulang Tahun
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editData.birthday}
                    onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                    className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  />
                ) : (
                  <p className="text-gray-700">{profile.birthday || 'Belum diisi'}</p>
                )}
              </div>

              {/* Member Since */}
              <div className="pt-4 border-t border-pink-100">
                <p className="text-sm text-gray-500">
                  Bergabung sejak {new Date(profile.createdAt).toLocaleDateString('id-ID', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Partner Profile Section */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Heart className="w-6 h-6 mr-2 text-pink-500" fill="#FF69B4" />
              Pasangan
            </h3>
            {partnerProfile ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                  {partnerProfile.photoURL ? (
                    <img src={partnerProfile.photoURL} alt="Partner" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{partnerProfile.name}</h4>
                  <p className="text-sm text-gray-500">{partnerProfile.bio || 'Belum ada bio'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Profil pasangan akan muncul di sini setelah Anda terhubung dengan pasangan Anda.
              </p>
            )}
            <button 
              onClick={() => setShowInviteModal(true)}
              className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              {partnerProfile ? 'Bagikan Link Lagi' : 'Undang Pasangan'}
            </button>
          </div>

          {/* Invite Modal */}
          <AnimatePresence>
            {showInviteModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowInviteModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-3xl p-6 max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Undang Pasangan</h3>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-4 rounded-2xl border-2 border-pink-200">
                        <QRCodeSVG
                          value={`${window.location.origin}/invite/${actualCoupleId}`}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-3 text-center">
                        Scan QR code untuk bergabung
                      </p>
                    </div>

                    {/* Invite Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Link Undangan
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={`${window.location.origin}/invite/${actualCoupleId}`}
                          readOnly
                          className="flex-1 p-3 bg-gray-100 rounded-xl text-sm text-gray-700"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="p-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors"
                        >
                          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                      {copied && (
                        <p className="text-sm text-green-600 mt-2">Link berhasil disalin!</p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Bagikan link atau QR code ini kepada pasangan Anda untuk menghubungkan akun.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full bg-red-50 border border-red-200 text-red-600 py-4 rounded-xl font-semibold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Keluar Aplikasi
          </button>
        </motion.div>
      </div>
    </div>
  );
}
