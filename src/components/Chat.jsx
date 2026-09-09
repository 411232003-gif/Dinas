import { useState, useEffect, useRef } from 'react';
import { Send, Heart, Smile, Image as ImageIcon, Mic, User, X, Play, Pause, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../firebase/config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';

export default function Chat({ coupleId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Load user name and photo from Firestore
    const loadUserProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || auth.currentUser?.displayName || 'Anonymous');
          setUserPhoto(userDoc.data().photoURL || '');
        } else {
          setUserName(auth.currentUser?.displayName || 'Anonymous');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUserName(auth.currentUser?.displayName || 'Anonymous');
      }
    };

    loadUserProfile();
  }, []);

  const reactions = ['❤️', '💋', '🥰', '😘', '🤗', '💕', '✨', '🔥'];

  useEffect(() => {
    if (!coupleId) return;

    const messagesRef = collection(db, 'couples', coupleId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
      
      // Load profiles for all users in messages
      const uniqueUserIds = [...new Set(messagesData.map(m => m.senderId))];
      const profiles = {};
      
      for (const userId of uniqueUserIds) {
        try {
          const userDocRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            profiles[userId] = {
              name: userDoc.data().name || 'Anonymous',
              photoURL: userDoc.data().photoURL || ''
            };
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
      
      setUserProfiles(profiles);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [coupleId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      alert('Silakan ketik pesan terlebih dahulu');
      return;
    }
    
    if (!coupleId) {
      alert('Anda belum terhubung dengan pasangan. Silakan undang pasangan terlebih dahulu dari menu Profile.');
      return;
    }

    try {
      console.log('Sending message to coupleId:', coupleId);
      await addDoc(collection(db, 'couples', coupleId, 'messages'), {
        text: newMessage,
        senderId: auth.currentUser?.uid,
        senderName: userName,
        createdAt: serverTimestamp(),
        reactions: [],
        type: 'text'
      });
      setNewMessage('');
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan: ' + error.message);
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const messageRef = doc(db, 'couples', coupleId, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);
      const currentReactions = message.reactions || [];
      
      if (!currentReactions.includes(emoji)) {
        await updateDoc(messageRef, {
          reactions: [...currentReactions, emoji]
        });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Gagal merekam audio. Pastikan izin mikrofon diberikan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const sendAudioMessage = async () => {
    if (!audioBlob || !coupleId) return;

    try {
      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result;

        await addDoc(collection(db, 'couples', coupleId, 'messages'), {
          text: '',
          senderId: auth.currentUser?.uid,
          senderName: userName,
          createdAt: serverTimestamp(),
          reactions: [],
          type: 'audio',
          audioData: base64Audio,
          duration: recordingTime
        });

        // Reset audio state
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
      };
    } catch (error) {
      console.error('Error sending audio:', error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setShowImageUpload(true);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const maxWidth = 800;
          const maxHeight = 800;
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
          
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(base64);
        };
      };
    });
  };

  const sendImageMessage = async () => {
    if (!selectedImage || !coupleId) return;

    setUploading(true);
    try {
      const compressedImage = await compressImage(selectedImage);

      await addDoc(collection(db, 'couples', coupleId, 'messages'), {
        text: '',
        senderId: auth.currentUser?.uid,
        senderName: userName,
        createdAt: serverTimestamp(),
        reactions: [],
        type: 'image',
        imageData: compressedImage
      });

      setSelectedImage(null);
      setShowImageUpload(false);
    } catch (error) {
      console.error('Error sending image:', error);
      alert('Gagal mengirim gambar. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-5rem)] md:h-[calc(100vh-4rem)] pt-2 sm:pt-3 md:pt-4 pb-20 sm:pb-20 md:pb-4 px-2 sm:px-3 md:px-4 overflow-hidden bg-white">
      {/* Header with Back Button */}
      {onBack && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Kembali</span>
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 mb-2 sm:mb-3 md:mb-4 relative" style={{ backgroundImage: 'url(/chat-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <AnimatePresence>
          {messages.map((message) => {
            const userProfile = userProfiles[message.senderId] || { name: message.senderName || 'Anonymous', photoURL: '' };
            const isOwnMessage = message.senderId === auth.currentUser?.uid;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex items-end gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                {/* Profile Photo */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 overflow-hidden border-2 ${
                  isOwnMessage ? 'border-pink-300 order-2' : 'border-purple-300 order-1'
                }`}>
                  {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                      <User className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className={`max-w-[75%] sm:max-w-[70%] md:max-w-[50%] relative group ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                  {/* Username */}
                  <span className={`text-[10px] sm:text-xs font-bold text-gray-700 mb-1 block ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                    {userProfile.name}
                  </span>
                  
                  {/* Message Bubble */}
                  <div
                    className={`p-2 sm:p-3 rounded-lg ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                        : 'bg-white shadow-md'
                    }`}
                  >
                    {message.type === 'image' && message.imageData ? (
                      <img src={message.imageData} alt="Shared image" className="max-w-full rounded-lg mb-2" />
                    ) : message.type === 'audio' && message.audioData ? (
                      <audio controls className="w-full mb-2 h-8">
                        <source src={message.audioData} type="audio/webm" />
                        Your browser does not support audio.
                      </audio>
                    ) : (
                      <p className="text-xs sm:text-sm md:text-base text-gray-900 break-words">{message.text}</p>
                    )}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {message.reactions.map((reaction, idx) => (
                          <span key={idx} className="text-lg">{reaction}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Reaction Button */}
                  <button
                    onClick={() => setShowReactions(message.id)}
                    className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart className="w-5 h-5 text-love-pink-dark" />
                  </button>
                  {showReactions === message.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-12 right-0 bg-white rounded-full shadow-lg p-2 flex gap-1 z-10"
                    >
                      {reactions.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            addReaction(message.id, emoji);
                            setShowReactions(null);
                          }}
                          className="text-xl hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-1 sm:gap-2 items-center flex-shrink-0 px-1">
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-1 sm:p-1.5 md:p-2 text-gray-500 hover:text-love-pink transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button 
            type="button" 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-1 sm:p-1.5 md:p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-love-pink'}`}
          >
            <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
        </div>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ketik pesan cinta..."
          className="flex-1 min-w-0 px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 rounded-full border border-pink-200 focus:outline-none focus:border-love-pink focus:ring-2 focus:ring-love-pink/20 transition-all text-gray-900 font-semibold text-sm sm:text-base md:text-base"
          style={{ fontSize: '16px' }}
        />
        <button
          type="submit"
          className="p-1.5 sm:p-2 md:p-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 hover:shadow-lg transition-all hover:scale-105 flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </button>
      </form>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold">Recording: {formatTime(recordingTime)}</span>
          </div>
        </div>
      )}

      {/* Audio Preview */}
      {audioUrl && !isRecording && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-white px-4 py-3 rounded-full shadow-lg z-50 flex items-center gap-3">
          <audio src={audioUrl} controls className="h-8" />
          <button
            onClick={sendAudioMessage}
            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setAudioBlob(null);
              setAudioUrl(null);
              setRecordingTime(0);
            }}
            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Upload Modal */}
      <AnimatePresence>
        {showImageUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImageUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Kirim Gambar</h3>
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {selectedImage && (
                <div className="mb-4">
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Preview"
                    className="w-full rounded-lg max-h-64 object-contain"
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={sendImageMessage}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {uploading ? 'Mengirim...' : 'Kirim'}
                </button>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setShowImageUpload(false);
                  }}
                  className="px-4 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
