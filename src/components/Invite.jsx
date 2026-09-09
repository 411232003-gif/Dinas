import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Heart, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Invite({ coupleId, onJoinSuccess }) {
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [partnerName, setPartnerName] = useState('');

  useEffect(() => {
    handleInvite();
  }, [coupleId]);

  const handleInvite = async () => {
    if (!coupleId) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    try {
      // Check if couple exists
      const coupleDocRef = doc(db, 'couples', coupleId);
      const coupleDoc = await getDoc(coupleDocRef);

      if (!coupleDoc.exists()) {
        setError('Couple not found. The invite link may be invalid.');
        setLoading(false);
        return;
      }

      const coupleData = coupleDoc.data();

      // Check if already has a partner
      if (coupleData.partnerId) {
        setError('This couple already has two members.');
        setLoading(false);
        return;
      }

      // Check if user is logged in
      if (!auth.currentUser) {
        setError('Please login first to join the couple.');
        setLoading(false);
        return;
      }

      // Check if user is the creator
      if (coupleData.createdBy === auth.currentUser.uid) {
        setError('You are the creator of this couple. Share this link with your partner.');
        setLoading(false);
        return;
      }

      // Join the couple
      await updateDoc(coupleDocRef, {
        partnerId: auth.currentUser.uid
      });

      // Update user profile with coupleId
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        coupleId: coupleId,
        partnerId: coupleData.createdBy
      });

      // Update creator's profile with partnerId
      const creatorDocRef = doc(db, 'users', coupleData.createdBy);
      await updateDoc(creatorDocRef, {
        partnerId: auth.currentUser.uid
      });

      // Get creator's name
      const creatorDoc = await getDoc(creatorDocRef);
      if (creatorDoc.exists()) {
        setPartnerName(creatorDoc.data().name || 'Your partner');
      }

      setJoined(true);
      setLoading(false);
      if (onJoinSuccess) {
        onJoinSuccess(coupleId);
      }
    } catch (error) {
      console.error('Error joining couple:', error);
      setError('Failed to join couple. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // After login, try to join again
      handleInvite();
    } catch (error) {
      console.error('Error signing in:', error);
      setError('Failed to sign in. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Joining couple...</p>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg"
        >
          <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <Heart className="w-16 h-16 text-pink-500 mx-auto mb-4 animate-pulse" fill="#FF69B4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Successfully Joined!</h2>
          <p className="text-gray-600 mb-6">
            You are now connected with {partnerName}. You can start chatting and using all the features together!
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Go to App
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg"
      >
        <Heart className="w-16 h-16 text-pink-500 mx-auto mb-4 animate-pulse" fill="#FF69B4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Join LoveNotes</h2>
        <p className="text-gray-600 mb-6">
          {error || 'Login to join your partner and start your romantic journey together!'}
        </p>
        {!auth.currentUser && (
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-pink-200 text-gray-700 py-3 rounded-xl hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Login with Google
          </button>
        )}
        <button
          onClick={() => window.location.href = '/'}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          {auth.currentUser ? 'Try Again' : 'Go to App'}
        </button>
      </motion.div>
    </div>
  );
}
