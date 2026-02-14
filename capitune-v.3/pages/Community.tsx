
import React, { useState, useRef, useEffect } from 'react';
import { User, NewsPost, UserRole, PostComment } from '../types';
import { MOCK_NEWS, MOCK_USERS } from '../constants';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  MoreHorizontal, 
  Image as ImageIcon, 
  Send, 
  Zap, 
  ShieldCheck, 
  Filter, 
  TrendingUp,
  Award,
  AlertTriangle,
  Smile,
  Globe,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';

interface CommunityProps {
  user: User;
}

const Community: React.FC<CommunityProps> = ({ user }) => {
  const [posts, setPosts] = useState<NewsPost[]>(MOCK_NEWS);
  const [activeFilter, setActiveFilter] = useState<'TOUS' | 'OFFICIEL' | 'CONSEIL'>('TOUS');
  
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isConseilMode, setIsConseilMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const EMOJIS = ['🇨🇦', '🍁', '✈️', '🎓', '🤝', '💼', '🏡', '✅', '⚠️', '🔥', '💡', '🙏', '🌍', '📝', '💪', '🎉', '🏢', '📚', '🤝', '🎯', '✨', '💻', '🗣️', '🇨🇦'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emoji: string) => setNewPostContent(prev => prev + emoji);

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      const isCurrentlyLiked = newSet.has(postId);
      if (isCurrentlyLiked) {
        newSet.delete(postId);
        setPosts(currentPosts => currentPosts.map(p => p.id === postId ? { ...p, likes: p.likes - 1 } : p));
      } else {
        newSet.add(postId);
        setPosts(currentPosts => currentPosts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
      }
      return newSet;
    });
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) newSet.delete(postId);
      else newSet.add(postId);
      return newSet;
    });
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;
    const newComment: PostComment = {
      id: `c-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      content: text,
      createdAt: new Date().toISOString()
    };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p));
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const handleShare = (postId: string) => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim() && !selectedImage) return;
    const newPost: NewsPost = {
      id: `n${Date.now()}`,
      authorId: user.id,
      category: isConseilMode ? 'CONSEIL' : 'COMMUNAUTE' as any,
      content: newPostContent,
      image: selectedImage || undefined,
      likes: 0,
      comments: [],
      createdAt: new Date().toISOString()
    };
    setPosts([newPost, ...posts]);
    setNewPostContent('');
    setSelectedImage(null);
    setIsConseilMode(false);
    setShowEmojiPicker(false);
  };

  const filteredPosts = posts.filter(p => activeFilter === 'TOUS' || p.category === activeFilter);

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-500 relative">
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-sm font-bold uppercase tracking-widest">Lien copié !</p>
        </div>
      )}

      <div className="lg:col-span-8 space-y-2">
        <div className="flex items-center justify-between mb-1 px-1">
          <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Espace Communautaire</h1>
          <div className="flex p-0.5 bg-white border border-slate-200 rounded-lg shadow-sm">
            {(['TOUS', 'OFFICIEL', 'CONSEIL'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className={`bg-white rounded-xl border p-3 shadow-sm transition-all ${isConseilMode ? 'border-purple-200 bg-purple-50/10' : 'border-slate-200'}`}>
          <div className="flex gap-3">
            <img src={user.avatar} className="w-9 h-9 rounded-lg object-cover shadow-sm" alt="" />
            <div className="flex-1 space-y-2">
               <div className="relative">
                 {selectedImage && (
                   <div className="mb-2 relative w-fit">
                     <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-slate-200" />
                     <button onClick={() => setSelectedImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full"><X className="w-2.5 h-2.5" /></button>
                   </div>
                 )}
                 <textarea 
                   value={newPostContent}
                   onChange={(e) => setNewPostContent(e.target.value)}
                   placeholder={`Exprimez-vous, ${user.name.split(' ')[0]}...`} 
                   className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-purple-200 min-h-[60px] outline-none transition-all resize-none font-medium placeholder:text-slate-400 ${isConseilMode ? 'bg-white border-purple-100' : ''}`}
                 />
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 items-center">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-purple-50 hover:text-purple-600" title="Image"><ImageIcon className="w-4 h-4" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                    <button onClick={() => setIsConseilMode(!isConseilMode)} className={`p-2 rounded-lg transition-all ${isConseilMode ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-purple-50 hover:text-purple-600'}`} title="Conseil Expert"><Zap className="w-4 h-4" /></button>
                    <div className="relative" ref={emojiPickerRef}>
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded-lg transition-all ${showEmojiPicker ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-purple-50 hover:text-purple-600'}`}><Smile className="w-4 h-4" /></button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-full left-0 mb-3 p-3 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                             <div className="grid grid-cols-6 gap-1">
                               {EMOJIS.slice(0, 18).map((e, i) => (<button key={i} onClick={() => addEmoji(e)} className="text-base p-1 hover:bg-purple-50 rounded-lg">{e}</button>))}
                             </div>
                          </div>
                        )}
                    </div>
                  </div>
                  <button 
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim() && !selectedImage}
                    className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 disabled:opacity-50"
                  >
                     Publier <Send className="w-3.5 h-3.5" />
                  </button>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {filteredPosts.map(post => {
            const author = MOCK_USERS.find(u => u.id === post.authorId) || user;
            const isLiked = likedPosts.has(post.id);
            const isExpanded = expandedComments.has(post.id);

            return (
              <div key={post.id} className="bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-300">
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 cursor-pointer">
                      <div className="relative">
                        <img src={author.avatar} className="w-8 h-8 rounded-lg object-cover shadow-sm" alt="" />
                        {author.role === UserRole.PROFESSIONNEL && (
                          <div className="absolute -right-0.5 -bottom-0.5 bg-white p-0.5 rounded-full shadow-sm">
                            <ShieldCheck className="w-3 h-3 text-purple-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900 leading-none">{author.name}</h4>
                          {post.category !== 'COMMUNAUTE' && (
                             <span className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded ${post.category === 'OFFICIEL' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                                {post.category}
                             </span>
                          )}
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                          {author.specialty || 'Membre'} • <Clock className="w-2.5 h-2.5 inline" /> Il y a peu
                        </p>
                      </div>
                    </div>
                    <button className="p-1.5 text-slate-300 hover:bg-slate-50 hover:text-slate-600 rounded-lg"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-slate-700 text-xs leading-relaxed font-medium">
                      {post.content}
                    </p>
                    {post.image && (
                      <div className="rounded-lg overflow-hidden border border-slate-50 bg-slate-50">
                        <img src={post.image} className="w-full h-auto object-cover max-h-[400px]" alt="" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-50">
                    <div className="flex gap-5">
                      <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 text-[10px] font-black transition-all ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}>
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
                        {post.likes}
                      </button>
                      <button onClick={() => toggleComments(post.id)} className={`flex items-center gap-1.5 text-[10px] font-black transition-all ${isExpanded ? 'text-purple-600' : 'text-slate-500 hover:text-purple-600'}`}>
                        <MessageSquare className={`w-4 h-4 ${isExpanded ? 'fill-purple-50' : ''}`} />
                        {post.comments.length}
                      </button>
                    </div>
                    <button onClick={() => handleShare(post.id)} className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-purple-600 rounded-lg"><Share2 className="w-4 h-4" /></button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-50 space-y-3">
                       <div className="space-y-2">
                         {post.comments.map(comment => (
                           <div key={comment.id} className="flex gap-2 items-start">
                              <img src={comment.authorAvatar} className="w-6 h-6 rounded-md object-cover" alt="" />
                              <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                 <p className="text-[9px] font-black text-slate-900 mb-0.5 uppercase">{comment.authorName}</p>
                                 <p className="text-[11px] text-slate-600 font-medium leading-normal">{comment.content}</p>
                              </div>
                           </div>
                         ))}
                       </div>
                       <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                          <img src={user.avatar} className="w-6 h-6 rounded-md object-cover" alt="" />
                          <div className="flex-1 relative">
                             <input 
                               type="text" 
                               value={commentInputs[post.id] || ''}
                               onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                               onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                               placeholder="Commenter..." 
                               className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-purple-200 transition-all font-medium pr-8"
                             />
                             <button onClick={() => handleAddComment(post.id)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-purple-600"><Send className="w-3.5 h-3.5" /></button>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-4 space-y-3">
        <section className="bg-slate-900 text-white p-5 rounded-xl shadow-lg relative overflow-hidden">
           <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-black uppercase tracking-widest">Gouvernance</h3>
           </div>
           <div className="space-y-3">
              {["Nouvelles directives IRCC TAFE.", "Mise en garde consultants.", "Webinaire MIFI demain."].map((alert, i) => (
                <div key={i} className="flex gap-2 group cursor-pointer hover:bg-white/5 p-1 rounded-lg">
                   <div className="w-1 h-1 rounded-full bg-purple-400 mt-2 shrink-0" />
                   <p className="text-[10px] font-bold text-slate-300 group-hover:text-white leading-tight">{alert}</p>
                </div>
              ))}
           </div>
        </section>

        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="text-xs font-black text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" /> Tendances
           </h3>
           <div className="space-y-3">
              {[{ tag: '#EntreeExpress', count: 124 }, { tag: '#PermisEtudes', count: 256 }, { tag: '#Installation', count: 89 }].map((topic, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                   <span className="text-[11px] font-black text-slate-600 group-hover:text-purple-600">{topic.tag}</span>
                   <span className="text-[8px] font-black text-slate-400 px-2 py-0.5 bg-slate-50 rounded uppercase">{topic.count}</span>
                </div>
              ))}
           </div>
        </section>

        <section className="bg-purple-600 p-5 rounded-xl text-white shadow-lg group">
           <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-purple-200" />
              <h3 className="text-xs font-black uppercase tracking-widest">Expert Actif</h3>
           </div>
           <div className="flex items-center gap-3 mb-3">
              <img src={MOCK_USERS[0].avatar} className="w-10 h-10 rounded-lg border-2 border-white/20" alt="" />
              <div>
                 <p className="text-xs font-black">{MOCK_USERS[0].name}</p>
                 <p className="text-[8px] text-purple-200 font-black uppercase">{MOCK_USERS[0].specialty}</p>
              </div>
           </div>
           <button className="w-full py-2 bg-white text-purple-900 rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
              Voir Profil
           </button>
        </section>
      </div>
    </div>
  );
};

export default Community;
