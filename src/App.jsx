import { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './components/Auth';
import BottomNav from './components/BottomNav';
import Beranda from './components/Beranda';
import Fitur from './components/Fitur';
import Profile from './components/Profile';
import LoveNotificationBanner from './components/LoveNotificationBanner';
import Invite from './components/Invite';
import PhotoGallery from './components/PhotoGallery';
import Chat from './components/Chat';
import Wishlist from './components/Wishlist';
import Notifications from './components/Notifications';
import { useDataCleanup } from './hooks/useDataCleanup';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('beranda');
  const [coupleId, setCoupleId] = useState('');
  const [inviteCoupleId, setInviteCoupleId] = useState(null);
  const [currentFeature, setCurrentFeature] = useState(null);

  // Enable automatic data cleanup
  useDataCleanup();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Check for invite link in URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      const inviteId = path.replace('/invite/', '');
      setInviteCoupleId(inviteId);
    }
  }, []);

  const handleCoupleIdChange = (newCoupleId) => {
    setCoupleId(newCoupleId);
  };

  const handleJoinSuccess = (joinedCoupleId) => {
    setCoupleId(joinedCoupleId);
    setInviteCoupleId(null);
    window.history.pushState({}, '', '/');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigateToFeature = (featureId) => {
    if (featureId === 'photoGallery') {
      setCurrentFeature('photoGallery');
    } else if (featureId === 'chat') {
      setCurrentFeature('chat');
    } else if (featureId === 'notifications') {
      setCurrentFeature('notifications');
    } else if (featureId === 'wishlist') {
      setCurrentFeature('wishlist');
    } else {
      setCurrentFeature(null);
      setActiveTab('fitur');
    }
  };

  const handleBackFromFeature = () => {
    setCurrentFeature(null);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentFeature(null);
  };

  // Show invite page if inviteCoupleId is set
  if (inviteCoupleId) {
    return <Invite coupleId={inviteCoupleId} onJoinSuccess={handleJoinSuccess} />;
  }

  if (!user) {
    return <Auth onLogin={() => setUser(auth.currentUser)} />;
  }

  const renderContent = () => {
    // If a specific feature is active, render it directly
    if (currentFeature === 'photoGallery') {
      return <PhotoGallery onBack={handleBackFromFeature} />;
    }
    if (currentFeature === 'chat') {
      return <Chat user={user} coupleId={coupleId} onBack={handleBackFromFeature} />;
    }
    if (currentFeature === 'notifications') {
      return <Notifications user={user} coupleId={coupleId} onBack={handleBackFromFeature} />;
    }
    if (currentFeature === 'wishlist') {
      return <Wishlist user={user} coupleId={coupleId} onBack={handleBackFromFeature} />;
    }

    // Otherwise, render based on active tab
    switch (activeTab) {
      case 'beranda':
        return <Beranda user={user} coupleId={coupleId} onNavigateToFeature={handleNavigateToFeature} />;
      case 'fitur':
        return <Fitur coupleId={coupleId} />;
      case 'profile':
        return <Profile user={user} coupleId={coupleId} onLogout={handleLogout} onCoupleIdChange={handleCoupleIdChange} />;
      default:
        return <Beranda user={user} coupleId={coupleId} onNavigateToFeature={handleNavigateToFeature} />;
    }
  };

  return (
    <div className="min-h-screen">
      <LoveNotificationBanner coupleId={coupleId} />
      <main>
        {renderContent()}
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNavigateToFeature={handleNavigateToFeature}
      />
    </div>
  );
}

export default App;
