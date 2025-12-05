import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Play, Pause, ArrowUpRight, Music, Instagram, Twitter } from 'lucide-react';
import { client } from './lib/microcms';
import ThreeGallery from './components/ThreeGallery';

// --- Assets & Data ---
const IMAGES = {
  hero: "/images/image1.jpg",
  profile1: "/images/image2.jpg",
  profile2: "/images/image3.jpg",
  work: "/images/work_new.jpg"
};

const DEMO_TRACKS = [
  { title: "NO-JEM", subtitle: "TikTokでウン万再生されたHOUSE系Hiphopトラック", label: "DEMO TRACK", file: "/audio/nojem.wav" },
  { title: "NEVER DIE", subtitle: "寺崎ヒナ(カッコ)", label: "DEMO TRACK", file: "/audio/NEVERDIE.wav" },
  { title: "My Sweet Memorie = 即死", subtitle: "寺崎ヒナ(ラップ)", label: "DEMO TRACK", file: "/audio/MySweetMemorie.wav" },
];



// --- Components ---

const FadeInSection = ({ children, delay = 0 }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => setVisible(entry.isIntersecting));
    });
    observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};



// Custom Cursor
const CustomCursor = () => {
  const cursorRef = useRef(null);

  useEffect(() => {
    const moveCursor = (e) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed w-8 h-8 border border-white/50 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-[9999] mix-blend-difference hidden md:block"
    />
  );
};

// Blog Modal Component
const BlogModal = ({ post, onClose }) => {
  if (!post) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4 md:p-8">
        <div
          className="bg-[#111] max-w-3xl w-full relative border border-white/10 shadow-2xl my-8"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>

          {post.thumbnail && (
            <div className="w-full bg-black flex justify-center">
              <img
                src={post.thumbnail.url}
                alt={post.title}
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            </div>
          )}

          <div className="p-8 md:p-12">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-gray-400 font-mono">
                {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
              </span>
              <span className={`text-[10px] px-2 py-0.5 border rounded-full ${post.author === 'hina'
                ? 'border-pink-500/50 text-pink-200/80'
                : 'border-cyan-500/50 text-cyan-200/80'
                }`}>
                {post.author === 'hina' ? 'HINA' : 'STAFF'}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-serif mb-8 leading-relaxed">
              {post.title}
            </h2>

            <div
              className="prose prose-invert max-w-none prose-img:rounded-lg prose-a:text-cyan-300"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <div className="mt-12 pt-8 border-t border-white/10 text-center">
              <button
                onClick={onClose}
                className="px-8 py-3 border border-white/20 hover:bg-white/10 transition-colors text-sm tracking-widest"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [blogPosts, setBlogPosts] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [visiblePosts, setVisiblePosts] = useState(4);
  const [loading, setLoading] = useState(true);

  // Audio Playback State
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playTrack = (track) => {
    if (currentTrack?.title === track.title) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(track.file);
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      setCurrentTrack(track);
      setIsPlaying(true);

      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  // Fetch Data from microCMS
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [blogData, newsData, scheduleData] = await Promise.all([
          client.get({ endpoint: 'blog', queries: { limit: 100 } }),
          client.get({ endpoint: 'news', queries: { limit: 100 } }),
          client.get({ endpoint: 'schedule', queries: { limit: 100, orders: 'date' } })
        ]);

        setBlogPosts(blogData.contents);
        setNewsItems(newsData.contents);
        setScheduleItems(scheduleData.contents);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLoadMore = () => {
    setVisiblePosts(prev => prev + 4);
  };

  // Combine News and Blog for the News Section
  const combinedNews = [
    ...newsItems.map(item => ({
      date: new Date(item.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.'),
      rawDate: new Date(item.date),
      cat: item.category ? item.category[0] : 'INFO', // Assuming category is an array or string
      title: item.title,
      link: item.link,
      isBlog: false
    })),
    ...blogPosts.map(post => ({
      date: new Date(post.publishedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.'),
      rawDate: new Date(post.publishedAt),
      cat: post.author === 'hina' ? 'BLOG (HINA)' : 'BLOG (STAFF)',
      title: post.title,
      isBlog: true,
      post: post
    }))
  ].sort((a, b) => b.rawDate - a.rawDate).slice(0, 5);


  return (
    <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-cyan-500/30">
      <CustomCursor />


      {/* Blog Modal */}
      {selectedPost && (
        <BlogModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 px-6 py-6 flex justify-between items-center mix-blend-difference">
        <div className="text-xl font-serif tracking-[0.2em] z-50">HINA TERASAKI</div>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="z-50 w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-transform duration-700 ease-[0.22,1,0.36,1] ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}
        onClick={() => setIsMenuOpen(false)}
      >
        <div className="h-full flex flex-col items-center justify-center gap-8" onClick={(e) => e.stopPropagation()}>
          {['NEWS', 'SCHEDULE', 'PROFILE', 'WORKS', 'BLOG', 'GALLERY'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setIsMenuOpen(false)}
              className="text-4xl md:text-6xl font-serif font-thin tracking-widest hover:text-cyan-200 transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-cyan-200 transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
          <div className="mt-12 flex gap-8">
            <a href="https://www.instagram.com/hina.terasaki/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors"><Instagram size={24} /></a>
            <a href="https://x.com/hina_terasaki_" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors"><Twitter size={24} /></a>
            <a href="https://www.tiktok.com/@hina.terasaki" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="none">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* --- Hero Section --- */}
      <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src={IMAGES.hero}
            alt="Hero"
            className="w-full h-full object-cover opacity-60 scale-105 animate-[pulse_8s_ease-in-out_infinite]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#050505]"></div>
        </div>

        <div className="relative z-10 text-left max-w-7xl mx-auto px-6 md:px-20 w-full">
          <FadeInSection>
            <div className="border-l border-white/50 pl-6 md:pl-8">
              <h2 className="text-xs md:text-sm tracking-[0.4em] text-white mb-4 uppercase">Singer Songwriter / Creator</h2>
              <h1 className="text-5xl md:text-8xl font-serif font-thin tracking-wide mb-6 leading-none">
                <span className="transition-colors duration-300 md:duration-[2000ms] hover:text-[#fff700] active:text-[#fff700]">HINA</span><br /><span className="transition-colors duration-300 md:duration-[2000ms] hover:text-cyan-200 active:text-cyan-200">TERASAKI</span>
              </h1>
              <p className="text-sm md:text-base text-gray-300 tracking-widest font-light opacity-80">
                透明な囁きから、デスボイスまで。<br />
                感じ取れ、温度を感じ取る。
              </p>
            </div>
          </FadeInSection>
        </div>

        {/* Scroll Indicator */}
        <div
          className="absolute bottom-10 right-10 flex flex-col items-center gap-4 animate-pulse opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
          onClick={() => document.getElementById('news').scrollIntoView({ behavior: 'smooth' })}
        >
          <div className="text-[10px] tracking-widest text-vertical">SCROLL</div>
          <div className="w-[1px] h-16 bg-white"></div>
        </div>
      </section>


      {/* --- NEWS Section --- */}
      <section id="news" className="py-24 px-6 md:px-20 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <h2 className="text-3xl font-serif mb-12 text-center tracking-widest">NEWS</h2>
          </FadeInSection>
          <div className="space-y-8">
            {combinedNews.map((item, i) => (
              <FadeInSection key={i} delay={i * 100}>
                <div
                  className="group flex flex-col md:flex-row md:items-center border-b border-white/10 pb-4 hover:border-cyan-500/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (item.isBlog) setSelectedPost(item.post);
                    else if (item.link) window.open(item.link, '_blank');
                  }}
                >
                  <div className="flex items-center gap-4 mb-2 md:mb-0 md:w-48">
                    <span className="text-sm text-gray-400 font-mono">{item.date}</span>
                    <span className={`text-[10px] px-2 py-0.5 border rounded-full ${item.cat.includes('HINA')
                      ? 'border-pink-500/50 text-pink-200/80'
                      : item.cat.includes('STAFF')
                        ? 'border-cyan-500/50 text-cyan-200/80'
                        : 'border-white/20 text-cyan-200/80'
                      }`}>{item.cat}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-light group-hover:text-cyan-100 transition-colors">{item.title}</h3>
                  </div>
                  <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                    <ArrowUpRight size={18} className="text-cyan-200" />
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
          <div className="mt-12 text-center">
            <a href="#" className="inline-block text-xs tracking-[0.2em] border-b border-white/30 pb-1 hover:text-cyan-200 hover:border-cyan-200 transition-colors">VIEW ALL</a>
          </div>
        </div>
      </section>

      {/* --- SCHEDULE Section --- */}
      <section id="schedule" className="py-24 px-6 md:px-20 bg-[#0f0f0f] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <h2 className="text-3xl font-serif mb-12 text-center tracking-widest">SCHEDULE</h2>
          </FadeInSection>

          <div className="grid gap-6">
            {loading ? (
              <div className="text-center py-12 text-gray-400">読み込み中...</div>
            ) : scheduleItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400">予定されているスケジュールはありません</div>
            ) : (
              scheduleItems.map((item, i) => (
                <FadeInSection key={i} delay={i * 100}>
                  <div className="group relative bg-white/5 border border-white/5 p-6 hover:bg-white/10 transition-all duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex flex-col md:w-1/4">
                        <span className="text-2xl font-serif text-cyan-200">
                          {new Date(item.date).toLocaleDateString('ja-JP').replace(/\//g, '.')}
                        </span>
                        {item.time && <span className="text-sm text-gray-400">{item.time}</span>}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-medium mb-1 group-hover:text-white transition-colors">{item.event}</h3>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="w-1 h-1 bg-cyan-500 rounded-full"></span>
                          {item.venue}
                        </p>
                      </div>
                      <div className="md:w-32 flex justify-end">
                        {item.ticketStatus && item.ticketStatus[0] === 'ON SALE' ? (
                          item.ticketUrl ? (
                            <a
                              href={item.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-2 border border-cyan-500/50 text-cyan-200 text-xs tracking-widest hover:bg-cyan-500/20 transition-colors inline-block animate-pulse"
                            >
                              TICKET
                            </a>
                          ) : (
                            <button className="px-6 py-2 border border-cyan-500/50 text-cyan-200 text-xs tracking-widest hover:bg-cyan-500/20 transition-colors animate-pulse">TICKET</button>
                          )
                        ) : item.ticketStatus && item.ticketStatus[0] === 'SOLD OUT' ? (
                          <span className="text-xs tracking-widest text-gray-600 line-through">SOLD OUT</span>
                        ) : item.ticketStatus && item.ticketStatus[0] === 'COMING SOON' ? (
                          <span className="text-xs tracking-widest text-gray-400">COMING SOON</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </FadeInSection>
              ))
            )}
          </div>
        </div>
      </section>

      {/* --- Profile / Philosophy Section --- */}
      <section id="profile" className="py-24 px-6 md:px-20 relative bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto mb-16">
          <FadeInSection>
            <h2 className="text-3xl font-serif text-center tracking-widest">PROFILE</h2>
          </FadeInSection>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">

          <FadeInSection>
            <div
              className="relative group bg-cyan-500 transition-all duration-[2000ms]"
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="absolute -top-10 -left-10 w-32 h-32 border-t border-l border-cyan-900/50"></div>
              <img
                src={IMAGES.profile1}
                alt="Profile"
                className="w-full h-[600px] object-cover grayscale brightness-90 contrast-125 transition-all duration-[2000ms] ease-in-out group-hover:mix-blend-multiply group-hover:opacity-90 group-hover:grayscale-0 group-active:mix-blend-multiply group-active:opacity-90 group-active:grayscale-0"
                onContextMenu={(e) => e.preventDefault()}
              />
              <div className="absolute bottom-0 right-0 bg-[#0a0a0a] p-4 border-t border-l border-white/10 z-10">
                <div className="text-xs text-cyan-200">2003 - 2025</div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={200}>
            <div>
              <h2 className="text-3xl md:text-4xl font-serif mb-10 tracking-wider">
                パフォーマーから、<br />
                <span className="text-cyan-200/80">クリエイター</span>へ。
              </h2>

              <div className="space-y-6 text-sm md:text-base text-gray-400 font-light leading-loose text-justify">
                <p>
                  17歳で『Girls Planet 999:少女祭典』(2021) に参加。アイドルという夢への挑戦を糧に、現在は「寺崎ヒナ」として作詞・作曲・ディレクションまで担うシンガーソングライターへと進化しました。
                </p>
                <p>
                  「言葉にできない感情を、音にする」<br />
                  その信念のもと、デスボイスを取り入れた激しいロックから、心に寄り添うバラードまで、ジャンルに縛られない表現を追求しています。
                </p>
                <p>
                  2025年、新たなプロジェクトが始動。彼女が描く世界は、まだ始まったばかりです。
                </p>
              </div>


            </div>
          </FadeInSection>
        </div>
      </section>

      {/* --- WORKS Section --- */}
      <section id="works" className="py-24 px-6 md:px-20 bg-[#050505]">
        <div className="max-w-7xl mx-auto">
          <FadeInSection>
            <h2 className="text-3xl font-serif mb-16 text-center tracking-widest">WORKS</h2>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Demo Tracks List */}
            <div className="space-y-6">
              {DEMO_TRACKS.map((track, i) => (
                <FadeInSection key={i} delay={i * 100}>
                  <div className="group bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-xs text-cyan-500 tracking-widest">{track.label}</div>
                      <div className="flex gap-3">
                        <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
                          <Music size={14} className={currentTrack?.title === track.title && isPlaying ? "animate-spin" : ""} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); playTrack(track); }}
                          className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                          {currentTrack?.title === track.title && isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-serif mb-2 group-hover:text-cyan-100 transition-colors">{track.title}</h3>
                    <p className="text-sm text-gray-400">{track.subtitle}</p>
                    <div className="mt-4 w-full h-4 overflow-hidden flex items-end">
                      {currentTrack?.title === track.title && isPlaying ? (
                        <div className="flex items-end gap-1 h-full w-full">
                          {[...Array(20)].map((_, barIndex) => (
                            <div
                              key={barIndex}
                              className="w-1 bg-cyan-500/80 animate-music-bar rounded-t-sm"
                              style={{
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${0.4 + Math.random() * 0.4}s`,
                                height: '20%'
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden self-center">
                          <div className="h-full bg-gradient-to-r from-cyan-500/50 to-pink-500/50" style={{ width: '0%' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>

            {/* Right: Large Image */}
            <FadeInSection delay={200}>
              <div className="relative group">
                <img
                  src={IMAGES.work}
                  alt="Hina Terasaki Performance"
                  className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-500 hover:scale-105"
                />
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>


      {/* --- BLOG Section --- */}
      <section id="blog" className="py-24 px-6 md:px-20 bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <h2 className="text-3xl font-serif mb-16 text-center tracking-widest">BLOG</h2>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-6">
            {blogPosts.slice(0, visiblePosts).map((post, i) => (
              <FadeInSection key={post.id} delay={i * 100}>
                <div
                  className="group bg-[#111] border border-white/5 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer h-full flex flex-col active:scale-95"
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="aspect-video overflow-hidden bg-gray-900 relative group-hover:opacity-90 transition-opacity">
                    {post.thumbnail ? (
                      <>
                        <img
                          src={post.thumbnail.url}
                          alt={post.title}
                          className="w-full h-full object-contain bg-black transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 text-[10px] tracking-wider border border-white/10">
                          {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#050505] flex flex-col items-center justify-center relative overflow-hidden border-b border-white/5">
                        {/* Decorative Background Text */}
                        <div className="absolute -bottom-4 -right-4 text-[80px] font-serif text-white/5 rotate-[-10deg] select-none pointer-events-none whitespace-nowrap">
                          HINA TERASAKI
                        </div>

                        {/* Centered Content */}
                        <div className="z-10 flex flex-col items-center gap-2">
                          <span className="text-3xl font-serif text-gray-400 tracking-widest">
                            {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
                          </span>
                          <div className="w-8 h-[1px] bg-cyan-500/50"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="mb-3">
                      <span className={`text-[10px] px-2 py-0.5 border rounded-full ${post.author === 'hina'
                        ? 'border-pink-500/50 text-pink-200/80'
                        : 'border-cyan-500/50 text-cyan-200/80'
                        }`}>
                        {post.author === 'hina' ? 'HINA' : 'STAFF'}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium mb-3 line-clamp-2 group-hover:text-cyan-100 transition-colors">
                      {post.title}
                    </h3>
                    <div
                      className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1"
                      dangerouslySetInnerHTML={{ __html: post.content.replace(/<[^>]+>/g, '') }}
                    />
                    <div className="text-xs text-cyan-500 tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                      READ MORE <ArrowUpRight size={12} />
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>

          {blogPosts.length > visiblePosts && (
            <div className="mt-12 text-center">
              <button
                onClick={handleLoadMore}
                className="px-8 py-3 border border-white/20 hover:bg-white/10 transition-colors text-sm tracking-widest"
              >
                VIEW MORE
              </button>
            </div>
          )}
        </div>
      </section>

      {/* --- GALLERY Section --- */}
      <section id="gallery" className="h-screen w-full relative bg-black overflow-hidden">
        <div className="absolute top-10 left-0 w-full z-10 text-center pointer-events-none">
          <h2 className="text-3xl font-serif tracking-widest text-white/80 mix-blend-difference">GALLERY</h2>
          <p className="text-xs text-gray-400 mt-2 tracking-widest">SCROLL / DRAG TO EXPLORE</p>
        </div>
        <ThreeGallery />
      </section>

      {/* --- Footer --- */}
      <footer className="py-20 px-6 bg-black text-center border-t border-white/10">
        <div className="mb-8 flex justify-center gap-6">
          <a href="https://www.instagram.com/hina.terasaki/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <Instagram size={18} />
          </a>
          <a href="https://x.com/hina_terasaki_" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <Twitter size={18} />
          </a>
          <a href="https://www.tiktok.com/@hina.terasaki" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
          </a>
        </div>
        <div className="text-2xl font-serif tracking-[0.2em] mb-4">HINA TERASAKI</div>
        <div className="text-[10px] text-gray-600 tracking-widest">© 2025 HINA TERASAKI OFFICIAL.</div>
      </footer>

    </div>
  );
}
