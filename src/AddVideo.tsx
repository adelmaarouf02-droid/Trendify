import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType, auth } from './firebase';
import { collection, addDoc } from "firebase/firestore";

const AddVideo = () => {
  const [videoData, setVideoData] = useState({ url: '', caption: '', source: 'tiktok' });

  const handleUpload = async () => {
    const trimmedUrl = videoData.url.trim();
    if(trimmedUrl) {
      try {
        const trendsRef = collection(db, 'trends');
        const user = auth.currentUser;
        await addDoc(trendsRef, {
          ...videoData,
          url: trimmedUrl,
          user: user?.displayName || 'مستخدم_مجهول',
          userId: user?.uid,
          createdAt: new Date().toISOString()
        });
        alert("تمت إضافة التريند بنجاح! 🚀");
        setVideoData({ url: '', caption: '', source: 'tiktok' });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'trends');
      }
    } else {
      alert("الرجاء إدخال رابط الفيديو");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const trendsRef = collection(db, 'trends');
        
        if (Array.isArray(json)) {
          for (const video of json) {
            await addDoc(trendsRef, {
              url: video.url || '',
              caption: video.caption || '',
              source: video.source || 'tiktok'
            });
          }
          alert("تمت إضافة الفيديوهات من ملف JSON بنجاح! 🚀");
        } else {
          alert("ملف JSON يجب أن يحتوي على مصفوفة من الفيديوهات.");
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'trends');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 bg-gray-900 text-white rounded-xl">
      <h2 className="text-xl mb-4 font-bold">إضافة تريند جديد لـ Trendify</h2>
      
      <div className="mb-4 p-4 border border-dashed border-gray-600 rounded">
        <label className="block text-sm mb-2 text-gray-400">أو ارفع ملف JSON:</label>
        <input type="file" accept=".json" onChange={handleFileChange} className="text-sm" />
      </div>

      <input 
        className="w-full p-2 mb-2 bg-gray-800 border border-gray-700 rounded"
        placeholder="رابط الفيديو (Direct Link)"
        value={videoData.url}
        onChange={(e) => setVideoData({...videoData, url: e.target.value})}
      />
      <textarea 
        className="w-full p-2 mb-2 bg-gray-800 border border-gray-700 rounded"
        placeholder="اكتب وصف يشد الناس..."
        value={videoData.caption}
        onChange={(e) => setVideoData({...videoData, caption: e.target.value})}
      />
      <select 
        className="w-full p-2 mb-4 bg-gray-800 border border-gray-700 rounded"
        value={videoData.source}
        onChange={(e) => setVideoData({...videoData, source: e.target.value})}
      >
        <option value="tiktok">تيك توك</option>
        <option value="facebook">فيسبوك</option>
        <option value="youtube">يوتيوب</option>
      </select>
      <button 
        onClick={handleUpload}
        className="w-full bg-orange-500 p-3 rounded-lg font-bold hover:bg-orange-600"
      >
        نزل الفيديو على التطبيق الآن
      </button>
    </div>
  );
};

export default AddVideo;
