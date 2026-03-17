import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { db, handleFirestoreError, OperationType, auth } from './firebase';
import { collection, onSnapshot } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { Smartphone, Facebook, Youtube, Heart, User as UserIcon, Home } from 'lucide-react';
import AddVideo from './AddVideo';

// موديل بيانات تجريبي أكثر استقراراً
const MOCK_DATA = [
  { id: 'mock1', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', user: 'bunny_fan', desc: 'فيديو تجريبي: أرنب ضخم! 🐰', likes: '1.2k', source: 'direct' },
  { id: 'mock2', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', user: 'rick_roller', desc: 'أشهر فيديو في تاريخ الإنترنت! 🕺', likes: '10M', source: 'youtube' },
];

const VideoCard: React.FC<{ video: any }> = ({ video }) => {
  const [likes, setLikes] = useState(100);
  const [isLiked, setIsLiked] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const handleLike = () => {
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
    setIsLiked(!isLiked);
  };

  const onVideoError = () => {
    console.error("Video Error for URL:", video.url);
    setVideoError("عذراً، حدث خطأ أثناء تحميل الفيديو. قد يكون الفيديو غير متاح للتضمين أو الرابط غير صالح.");
    setIsReady(false);
  };

  const videoUrl = (video.url || '').trim();

  const handleRetry = () => {
    setVideoError(null);
    setRetryCount(prev => prev + 1);
    setIsReady(false);
  };

  return (
    <div className="relative w-full max-w-md mx-auto bg-zinc-900 rounded-2xl overflow-hidden shadow-lg p-4 mb-4">
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
        {!isReady && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        )}
        {videoError ? (
          <div className="text-center p-4 flex flex-col items-center gap-3 z-20">
            <p className="text-red-500 text-xs">{videoError}</p>
            <div className="flex gap-4">
              <button 
                onClick={handleRetry}
                className="bg-white/10 text-white text-[10px] px-3 py-1 rounded-full border border-white/20"
              >
                إعادة المحاولة 🔄
              </button>
              <a 
                href={videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-orange-500 text-white text-[10px] px-3 py-1 rounded-full font-bold"
              >
                فتح في صفحة جديدة ↗
              </a>
            </div>
          </div>
        ) : (
          <ReactPlayer
            key={`${videoUrl}-${retryCount}`}
            url={videoUrl}
            controls
            width="100%"
            height="100%"
            className="absolute top-0 left-0"
            onError={onVideoError}
            onReady={() => {
              console.log("ReactPlayer: Ready", videoUrl);
              setIsReady(true);
            }}
            onStart={() => console.log("ReactPlayer: Start", videoUrl)}
            playsInline
            muted
            playing={false}
            config={{
              youtube: { 
                playerVars: { 
                  modestbranding: 1,
                  rel: 0,
                  iv_load_policy: 3
                }
              }
            }}
          />
        )}
      </div>
      
      <div className="p-4 flex items-center justify-between">
        <div className="flex flex-col text-right">
          <h3 className="font-bold text-white text-sm">@{video.user || 'مستخدم_تريند'}</h3>
          <p className="text-xs text-gray-300" dir="rtl">{video.desc || video.caption || 'لا يوجد وصف'}</p>
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
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    console.log("Trendify App is starting...");
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

  const filteredVideos = activeTab === 'all' 
    ? videos 
    : videos.filter(v => v.source === activeTab);

  return (
    <div className="relative min-h-screen bg-black overflow-y-auto pb-20">
      <div className="max-w-2xl mx-auto">
        {currentView === 'feed' && (
          <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md p-4 border-b border-white/5 flex justify-center gap-4 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'الكل', icon: <Smartphone size={14} /> },
              { id: 'tiktok', label: 'تيك توك', icon: <Smartphone size={14} /> },
              { id: 'facebook', label: 'فيسبوك', icon: <Facebook size={14} /> },
              { id: 'youtube', label: 'يوتيوب', icon: <Youtube size={14} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {showAddVideo && user && (
          <div className="sticky top-4 z-50 p-4">
            <AddVideo />
          </div>
        )}

        {currentView === 'feed' ? (
          <>
            <div className="flex flex-col gap-6 p-4">
              {isLoading ? (
                <div className="h-[80vh] flex flex-col items-center justify-center text-white">
                  <p className="animate-pulse">جاري تحميل الفيديوهات...</p>
                </div>
              ) : filteredVideos.length > 0 ? (
                filteredVideos.map((video) => (
                  <VideoCard key={video.id || video.url} video={video} />
                ))
              ) : (
                <div className="h-[80vh] flex flex-col items-center justify-center text-white">
                  <p>مفيش فيديوهات هنا دلوقتي يا بطل.. جرب فلتر تاني!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          user && <ProfilePage user={user} onLogout={handleLogout} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-md border-t border-white/10 z-50 flex justify-around items-center text-white max-w-2xl mx-auto">
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
