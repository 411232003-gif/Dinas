import { useState, useEffect, useRef } from 'react';
import { Home, User, Image, MessageCircle, Grid3X3 } from 'lucide-react';
import './BottomNav.css';

export default function BottomNav({ activeTab, onTabChange, onNavigateToFeature }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const handleTab = (tabId) => {
    setIsOpen(false);
    onTabChange(tabId);
  };

  const handleFeature = (featureId) => {
    setIsOpen(false);
    onNavigateToFeature(featureId);
  };

  return (
    <div className="bottom-nav">
      <div className="bottom-nav__bar">
        <button
          className={`bottom-nav__item ${activeTab === 'beranda' ? 'active' : ''}`}
          onClick={() => handleTab('beranda')}
          aria-label="Beranda"
        >
          <Home />
          <span>Beranda</span>
        </button>
        <button
          className={`bottom-nav__item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTab('profile')}
          aria-label="Profile"
        >
          <User />
          <span>Profile</span>
        </button>
        <div className="bottom-nav__dot" />
      </div>

      <div className={`bottom-nav__radial ${isOpen ? 'open' : ''}`} ref={menuRef}>
        <button
          className="bottom-nav__toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={isOpen}
        >
          <span className="bottom-nav__bar-h" />
          <span className="bottom-nav__bar-v" />
        </button>

        <button
          className="bottom-nav__menu-item"
          onClick={() => handleFeature('photoGallery')}
          aria-label="Foto"
          title="Foto"
        >
          <Image />
        </button>
        <button
          className="bottom-nav__menu-item"
          onClick={() => handleFeature('chat')}
          aria-label="Chat"
          title="Chat"
        >
          <MessageCircle />
        </button>
        <button
          className="bottom-nav__menu-item"
          onClick={() => handleFeature('fitur')}
          aria-label="Fitur"
          title="Fitur"
        >
          <Grid3X3 />
        </button>
      </div>
    </div>
  );
}
