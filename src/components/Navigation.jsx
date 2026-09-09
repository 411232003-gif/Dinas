import { useState } from 'react';
import { Heart, MessageCircle, Clock, BookOpen, ListTodo, Gamepad2, BarChart3, Bell, LogOut } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, onLogout }) {
  const navItems = [
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'timeline', icon: Clock, label: 'Timeline' },
    { id: 'notes', icon: BookOpen, label: 'Love Notes' },
    { id: 'notifications', icon: Bell, label: 'Notifikasi' },
    { id: 'wishlist', icon: ListTodo, label: 'Wishlist' },
    { id: 'games', icon: Gamepad2, label: 'Games' },
    { id: 'stats', icon: BarChart3, label: 'Intimacy' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-pink-200 z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="hidden md:flex items-center gap-2">
            <Heart className="w-8 h-8 text-love-pink-dark animate-heartbeat" fill="#FF69B4" />
            <span className="text-xl font-bold text-gradient">LoveNotes</span>
          </div>
          
          <div className="flex items-center justify-around w-full md:w-auto md:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                    activeTab === item.id
                      ? 'text-love-pink-dark bg-pink-100'
                      : 'text-gray-500 hover:text-love-pink'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs md:text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onLogout}
            className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
