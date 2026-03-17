import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from './firebase';
import { collection, onSnapshot } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { Smartphone, Facebook, Youtube, Heart, User as UserIcon, Home } from 'lucide-react';
import AddVideo from './AddVideo';

// موديل بيانات تجريبي
const MOCK_DATA = [
  { id: 1, url: 'https://www.w3schools.com/html/mov_bbb.mp4', user: '@test_user', desc: 'فيديو تجريبي بسيط', likes: '100', source: 'tiktok' },
];

const VideoCard: React.FC<{ video: any }> = ({ video }) => {
  const [likes, setLikes] = useState(100);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
    setIsLiked(!isLiked);
  };

  return (
    <div className="relative w-full bg-zinc-900 rounded-2xl overflow-hidden shadow-lg p-4">
      <div className="w-full h-64 bg-black rounded-lg overflow-hidden">
        <video
          controls
          className="w-full h-full object-contain"
          src={video.url}
        >
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </div>
      
      <div className="p-4 flex items-center justify-between">
        <div className="flex flex-col text-right">
          <h3 className="font-bold text-white text-sm">@{video.user}</h3>
          <p className="text-xs text-gray-300" dir="rtl">{video.desc}</p>
        </div>
        
        <button onClick={handleLike} className={`p-2 rounded-full ${isLiked ? 'bg-red-500' : 'bg-white/10'}`}>
          <Heart size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
};

const ProfilePage = ({ user, onLogout }: { user: User, onLogout: () => void }) => (
  <div className="h-screen flex flex-col items-center justify-center text-white p-6">
    <img src={user.photoURL || ''} alt="Profile" className="w-24 h-24 rounded-full mb-4 border-2 border-orange-500" referrerPolicy="no-referrer" />
    <h2 className="text-xl font-bold mb-2">{user.displayName}</h2>
    <p className="text-gray-400 mb-6">{user.email}</p>
    <button onClick={onLogout} className="bg-red-600 text-white px-8 py-2 rounded-full font-bold">
      تسجيل خروج
    </button>
  </div>
);

const TrendifyApp = () => {
  const [videos, setVideos] = useState<any[]>(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'feed' | 'profile'>('feed');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setCurrentView('feed');
    });
    return () => unsubscribeAuth();
  }, []);

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error signing in:", error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError("تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setLoginError("تم إلغاء عملية تسجيل الدخول.");
      } else {
        setLoginError("حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('feed');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const trendsRef = collection(db, 'trends');
    const unsubscribe = onSnapshot(trendsRef, (snapshot) => {
      const videoList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      console.log("Firestore data:", videoList);
      if (videoList.length > 0) {
        setVideos(videoList);
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trends');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredVideos = videos;

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {showAddVideo && user && (
        <div className="absolute top-20 left-4 right-4 z-50">
          <AddVideo />
        </div>
      )}

      {currentView === 'feed' ? (
        <>
          <div className="flex flex-col gap-6 p-4 pb-20">
            {isLoading ? (
              <div className="h-screen flex flex-col items-center justify-center text-white">
                <p>جاري تحميل الفيديوهات...</p>
              </div>
            ) : filteredVideos.length > 0 ? (
              filteredVideos.map((video) => (
                <VideoCard key={video.id || video.url} video={video} />
              ))
            ) : (
              <div className="h-screen flex flex-col items-center justify-center text-white">
                <p>مفيش فيديوهات هنا دلوقتي يا بطل.. جرب فلتر تاني!</p>
              </div>
            )}
          </div>
        </>
      ) : (
        user && <ProfilePage user={user} onLogout={handleLogout} />
      )}

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-md border-t border-white/10 z-50 flex justify-around items-center text-white">
        <button onClick={() => { setCurrentView('feed'); }} className="flex flex-col items-center">
          <Home size={20} />
          <span className="text-[10px]">الرئيسية</span>
        </button>
        
        {user ? (
          <>
            <button onClick={() => setShowAddVideo(!showAddVideo)} className="bg-orange-500 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold">
              +
            </button>
            <button onClick={() => setCurrentView('profile')} className="flex flex-col items-center">
              <UserIcon size={20} />
              <span className="text-[10px]">الملف الشخصي</span>
            </button>
          </>
        ) : (
          <button onClick={handleLogin} disabled={isLoggingIn} className="bg-red-600 text-white px-6 py-2 rounded-full font-bold text-sm disabled:opacity-50">
            {isLoggingIn ? 'جاري التسجيل...' : 'تسجيل دخول'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TrendifyApp;
