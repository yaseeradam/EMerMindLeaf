import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, BookOpen, Plus, Library, Coins, ChevronLeft, ChevronRight, Play, Pause, Square, Download, Trash2, Menu, X, Sparkles, Clock, Palette } from 'lucide-react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Progress } from './components/ui/progress';
import { Skeleton } from './components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './components/ui/alert-dialog';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ─── API Helper ───
const api = {
  async get(path) {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  },
  async post(path, data) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  },
  async del(path) {
    const res = await fetch(`${API_URL}${path}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  },
};

// ─── User Context ───
const UserContext = createContext(null);
const useUser = () => useContext(UserContext);

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get('/api/user/me');
      setUser(data);
    } catch (e) {
      console.error('Failed to fetch user:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ─── Navbar ───
function Navbar() {
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="navbar" data-testid="navbar">
      <Link to="/" className="mindleaf-logo" data-testid="navbar-logo">
        <Leaf className="leaf-icon" style={{ color: 'hsl(132, 46%, 33%)' }} />
        <span>MindLeaf</span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
        <Link to="/" className="text-sm font-medium hover:text-[hsl(132,46%,33%)] transition-colors" data-testid="nav-home">Home</Link>
        <Link to="/library" className="text-sm font-medium hover:text-[hsl(132,46%,33%)] transition-colors" data-testid="nav-library">Library</Link>
        <Link to="/create" className="text-sm font-medium hover:text-[hsl(132,46%,33%)] transition-colors" data-testid="nav-create">New Story</Link>
        {user && (
          <div className="credit-badge" data-testid="nav-credits">
            <Coins size={16} />
            {user.credits ?? 0} credits
          </div>
        )}
      </div>

      {/* Mobile menu button */}
      <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle">
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-0 right-0 bg-white border-b border-[hsl(var(--border))] p-4 flex flex-col gap-3 md:hidden z-50"
          >
            <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium p-2">Home</Link>
            <Link to="/library" onClick={() => setMobileOpen(false)} className="text-sm font-medium p-2">Library</Link>
            <Link to="/create" onClick={() => setMobileOpen(false)} className="text-sm font-medium p-2">New Story</Link>
            {user && (
              <div className="credit-badge" data-testid="mobile-credits">
                <Coins size={16} /> {user.credits ?? 0} credits
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ─── Home Dashboard ───
function HomePage() {
  const { user, loading } = useUser();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="page-container">
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="bento-grid">
          <Skeleton className="h-48 md:col-span-7" />
          <Skeleton className="h-48 md:col-span-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="home-page">
      <div className="bento-grid">
        {/* Greeting + Actions */}
        <motion.div
          className="bento-card md:col-span-7"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Hello, {user?.display_name || 'Reader'}!
              </h1>
              <p className="text-[hsl(var(--muted-foreground))] mt-2">
                What magical story shall we create today?
              </p>
            </div>
            <Leaf size={40} className="opacity-10" style={{ color: 'hsl(132,46%,33%)' }} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-soft)] hover:opacity-90 active:scale-95 transition-transform"
              onClick={() => navigate('/create')}
              data-testid="home-new-story-button"
            >
              <Plus size={18} className="mr-2" />
              New Story
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-[var(--radius-btn)] border-[hsl(var(--border))] hover:bg-white"
              onClick={() => navigate('/library')}
              data-testid="home-library-button"
            >
              <Library size={18} className="mr-2" />
              My Library
            </Button>
          </div>
        </motion.div>

        {/* Credits */}
        <motion.div
          className="bento-card md:col-span-5"
          style={{ borderTop: '3px solid hsl(var(--brand-orange))' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your Credits</h2>
            <Coins size={20} style={{ color: 'hsl(var(--brand-orange))' }} />
          </div>
          <div className="text-4xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', monospace", color: 'hsl(var(--brand-orange))' }} data-testid="home-credit-balance">
            {user?.credits ?? 0}
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">credits remaining</p>
          <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-1">
            <p>Short story: 1 credit</p>
            <p>Medium story: 2 credits</p>
            <p>Long story: 3 credits</p>
            <p>Extended story: 5 credits</p>
          </div>
        </motion.div>

        {/* Quick Tips */}
        <motion.div
          className="bento-card md:col-span-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Sparkles size={18} className="inline mr-2" style={{ color: 'hsl(var(--brand-orange))' }} />
            Trending Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {['Space Adventure', 'Magic Forest', 'The Brave Lion', 'Ocean Mystery', 'African Folklore'].map(topic => (
              <button
                key={topic}
                className="topic-chip"
                onClick={() => navigate('/create', { state: { topic } })}
                data-testid={`trending-topic-${topic.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {topic}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Story Creator ───
const TOPICS = ['Space Adventure', 'Magic Forest', 'The Brave Lion', 'Ocean Mystery', 'African Folklore'];
const AGE_RANGES = ['5-7', '7-10', '10-12'];
const SUBJECTS = ['General', 'Science', 'Moral', 'History', 'Fantasy', 'Adventure'];
const LENGTHS = [
  { value: 'short', label: 'Short', pages: 3, credits: 1 },
  { value: 'medium', label: 'Medium', pages: 5, credits: 2 },
  { value: 'long', label: 'Long', pages: 8, credits: 3 },
  { value: 'extended', label: 'Extended', pages: 12, credits: 5 },
];
const ART_STYLES = [
  { value: 'default', label: 'MindLeaf', icon: <Leaf size={28} /> },
  { value: 'pixar', label: 'Pixar', icon: <Sparkles size={28} /> },
  { value: 'ghibli', label: 'Ghibli', icon: <Palette size={28} /> },
  { value: 'sketch', label: 'Sketch', icon: <BookOpen size={28} /> },
];

const LOADING_STEPS = [
  'Brainstorming your story...',
  'Writing the adventure...',
  'Creating illustrations...',
  'Painting the scenes...',
  'Adding final touches...',
  'Almost ready!',
];

function StoryCreatorPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const [topic, setTopic] = useState('');
  const [ageRange, setAgeRange] = useState('7-10');
  const [subject, setSubject] = useState('General');
  const [length, setLength] = useState('short');
  const [artStyle, setArtStyle] = useState('default');
  const [characterTraits, setCharacterTraits] = useState('');
  const [settingDetails, setSettingDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Check for pre-selected topic from navigation
  useEffect(() => {
    const state = window.history.state?.usr;
    if (state?.topic) setTopic(state.topic);
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 8000);
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 95));
    }, 600);
    return () => { clearInterval(stepInterval); clearInterval(progressInterval); };
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic for your story');
      return;
    }

    const cost = LENGTHS.find(l => l.value === length)?.credits || 1;
    if ((user?.credits ?? 0) < cost) {
      toast.error(`Not enough credits. You need ${cost} but have ${user?.credits ?? 0}`);
      return;
    }

    setIsGenerating(true);
    setLoadingStep(0);
    setProgress(0);

    try {
      const story = await api.post('/api/stories/generate', {
        topic: topic.trim(),
        age_range: ageRange,
        subject,
        length,
        art_style: artStyle,
        character_traits: characterTraits || null,
        setting_details: settingDetails || null,
      });

      setProgress(100);
      toast.success('Story created successfully!');
      await refreshUser();
      setTimeout(() => navigate(`/story/${story._id}`), 500);
    } catch (err) {
      toast.error(err.message || 'Failed to generate story');
      setIsGenerating(false);
    }
  };

  const selectedLength = LENGTHS.find(l => l.value === length);

  return (
    <>
      {/* Loading Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="story-loading-overlay"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Leaf size={60} style={{ color: 'hsl(132, 46%, 33%)' }} />
            </motion.div>
            <p className="step-text mt-6" data-testid="loading-step-text">{LOADING_STEPS[loadingStep]}</p>
            <p className="sub-text">This may take a minute or two...</p>
            <div className="w-64 mt-6">
              <Progress value={progress} className="h-2" />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">{progress}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-container" data-testid="story-creator-page">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Create a New Story
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">Fill in the details and let AI create a magical story for you!</p>
          </motion.div>

          {/* Topic */}
          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <label className="text-sm font-semibold mb-3 block">Topic</label>
            <Input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="What should the story be about?"
              className="text-base mb-3"
              data-testid="story-creator-topic-input"
            />
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => (
                <button
                  key={t}
                  className={`topic-chip ${topic === t ? 'selected' : ''}`}
                  onClick={() => setTopic(t)}
                  data-testid={`story-creator-topic-chip-${t.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.section>

          {/* Age Range */}
          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <label className="text-sm font-semibold mb-3 block">Age Range</label>
            <div className="flex gap-3">
              {AGE_RANGES.map(age => (
                <button
                  key={age}
                  className={`selection-card flex-1 text-center ${ageRange === age ? 'selected' : ''}`}
                  onClick={() => setAgeRange(age)}
                  data-testid={`story-creator-age-${age}`}
                >
                  <div className="text-lg font-bold">{age}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">years</div>
                </button>
              ))}
            </div>
          </motion.section>

          {/* Subject */}
          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <label className="text-sm font-semibold mb-3 block">Subject</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="w-full" data-testid="story-creator-subject-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.section>

          {/* Length */}
          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <label className="text-sm font-semibold mb-3 block">Story Length</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LENGTHS.map(l => (
                <button
                  key={l.value}
                  className={`selection-card text-center ${length === l.value ? 'selected' : ''}`}
                  onClick={() => setLength(l.value)}
                  data-testid={`story-creator-length-${l.value}`}
                >
                  <span className="cost-badge">{l.credits}cr</span>
                  <div className="text-lg font-bold mt-1">{l.label}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{l.pages} pages</div>
                </button>
              ))}
            </div>
          </motion.section>

          {/* Art Style */}
          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <label className="text-sm font-semibold mb-3 block">Art Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ART_STYLES.map(style => (
                <button
                  key={style.value}
                  className={`art-style-card ${artStyle === style.value ? 'selected' : ''}`}
                  onClick={() => setArtStyle(style.value)}
                  data-testid={`story-creator-art-${style.value}`}
                >
                  <div className="art-icon" style={{ color: artStyle === style.value ? 'hsl(132,46%,33%)' : 'hsl(var(--muted-foreground))' }}>
                    {style.icon}
                  </div>
                  <div className="text-sm font-medium">{style.label}</div>
                </button>
              ))}
            </div>
          </motion.section>

          {/* Optional Fields */}
          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <label className="text-sm font-semibold mb-3 block">Character Traits (optional)</label>
            <Input
              value={characterTraits}
              onChange={e => setCharacterTraits(e.target.value)}
              placeholder="e.g., brave, curious, kind-hearted"
              className="mb-4"
              data-testid="story-creator-traits-input"
            />
            <label className="text-sm font-semibold mb-3 block">Setting Details (optional)</label>
            <Textarea
              value={settingDetails}
              onChange={e => setSettingDetails(e.target.value)}
              placeholder="e.g., a magical kingdom on top of the clouds"
              data-testid="story-creator-setting-input"
            />
          </motion.section>

          {/* Generate Button */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--muted))] mb-4">
              <span className="text-sm">Cost: <strong>{selectedLength?.credits || 1} credit{(selectedLength?.credits || 1) > 1 ? 's' : ''}</strong></span>
              <span className="text-sm">Balance: <strong className="credit-badge">{user?.credits ?? 0}</strong></span>
            </div>
            <Button
              size="lg"
              className="w-full rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-soft)] hover:opacity-90 active:scale-95 transition-transform text-base py-6"
              onClick={handleGenerate}
              disabled={isGenerating}
              data-testid="story-creator-generate-button"
            >
              <Sparkles size={20} className="mr-2" />
              Generate Story
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
}

// ─── Story Viewer ───
function StoryViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [speechSynth] = useState(() => window.speechSynthesis);

  useEffect(() => {
    const loadStory = async () => {
      try {
        const data = await api.get(`/api/stories/${id}`);
        setStory(data);
      } catch (err) {
        toast.error('Failed to load story');
        navigate('/library');
      } finally {
        setLoading(false);
      }
    };
    loadStory();
  }, [id, navigate]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynth.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        const english = voices.find(v => v.lang.startsWith('en'));
        setSelectedVoice(english?.name || voices[0]?.name || '');
      }
    };
    loadVoices();
    speechSynth.onvoiceschanged = loadVoices;
    return () => { speechSynth.cancel(); };
  }, [speechSynth]);

  const handlePlay = () => {
    if (!story?.pages?.[currentPage]) return;

    if (isPlaying) {
      speechSynth.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(story.pages[currentPage].text);
    const voice = availableVoices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    speechSynth.speak(utterance);
    setIsPlaying(true);
  };

  const handleStop = () => {
    speechSynth.cancel();
    setIsPlaying(false);
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Generating PDF...');
      const res = await fetch(`${API_URL}/api/stories/${id}/pdf`);
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story?.title || 'story'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error('Failed to export PDF');
    }
  };

  const goToPage = (page) => {
    if (page >= 0 && page < (story?.pages?.length || 0)) {
      speechSynth.cancel();
      setIsPlaying(false);
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[500px] w-full max-w-3xl mx-auto rounded-2xl" />
      </div>
    );
  }

  if (!story) return null;

  const page = story.pages?.[currentPage];

  return (
    <div className="page-container" data-testid="story-viewer-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/library')} data-testid="story-viewer-back-button">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-xl sm:text-2xl font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {story.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleExportPDF} data-testid="story-viewer-export-pdf-button" title="Export PDF">
            <Download size={18} />
          </Button>
        </div>
      </div>

      {/* TTS Controls */}
      <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
        <Select value={selectedVoice} onValueChange={setSelectedVoice}>
          <SelectTrigger className="w-48" data-testid="story-viewer-tts-voice-select">
            <SelectValue placeholder="Select voice" />
          </SelectTrigger>
          <SelectContent>
            {availableVoices.map(v => (
              <SelectItem key={v.name} value={v.name}>{v.name.split(' ').slice(0, 3).join(' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={isPlaying ? 'default' : 'outline'}
          size="sm"
          onClick={handlePlay}
          className="rounded-full"
          data-testid="story-viewer-tts-play-button"
        >
          {isPlaying ? <Pause size={16} className="mr-1" /> : <Play size={16} className="mr-1" />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        {isPlaying && (
          <Button variant="ghost" size="sm" onClick={handleStop} className="rounded-full" data-testid="story-viewer-tts-stop-button">
            <Square size={16} className="mr-1" /> Stop
          </Button>
        )}
      </div>

      {/* Book Canvas */}
      <div className="book-canvas" data-testid="story-viewer-book-canvas">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            className="book-page"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Illustration */}
            <div className="illustration">
              {page?.image_base64 ? (
                <img
                  src={`data:image/jpeg;base64,${page.image_base64}`}
                  alt={`Illustration for page ${currentPage + 1}`}
                  data-testid="story-viewer-illustration"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-[hsl(var(--muted-foreground))]">
                  <Leaf size={48} className="opacity-30 mb-2" />
                  <p className="text-sm">Illustration unavailable</p>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="page-text" data-testid="story-viewer-page-text">
              {page?.text}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-[hsl(var(--border))]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            data-testid="story-viewer-prev-page-button"
          >
            <ChevronLeft size={18} className="mr-1" /> Previous
          </Button>
          <span className="page-indicator" data-testid="story-viewer-page-indicator">
            {currentPage + 1} / {story.pages?.length || 0}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= (story.pages?.length || 0) - 1}
            data-testid="story-viewer-next-page-button"
          >
            Next <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Library ───
function LibraryPage() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      const data = await api.get('/api/stories');
      setStories(data.stories || []);
    } catch (err) {
      toast.error('Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleDelete = async (storyId) => {
    try {
      await api.del(`/api/stories/${storyId}`);
      setStories(prev => prev.filter(s => s._id !== storyId));
      toast.success('Story deleted');
    } catch (err) {
      toast.error('Failed to delete story');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="library-grid">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="library-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          My Library
        </h1>
        <Button
          className="rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white"
          onClick={() => navigate('/create')}
          data-testid="library-new-story-button"
        >
          <Plus size={18} className="mr-2" /> New Story
        </Button>
      </div>

      {stories.length === 0 ? (
        <div className="empty-state" data-testid="library-empty-state">
          <BookOpen size={64} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
          <p className="text-sm mb-4">Create your first magical story!</p>
          <Button onClick={() => navigate('/create')} className="rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white">
            <Plus size={18} className="mr-2" /> Create Story
          </Button>
        </div>
      ) : (
        <div className="library-grid" data-testid="library-grid">
          {stories.map((story, idx) => (
            <motion.div
              key={story._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="story-card" data-testid={`library-story-card-${story._id}`}>
                <div
                  className="cover"
                  onClick={() => navigate(`/story/${story._id}`)}
                  data-testid={`library-story-open-${story._id}`}
                >
                  {story.cover_image ? (
                    <img src={`data:image/jpeg;base64,${story.cover_image}`} alt={story.title} />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Leaf size={40} className="opacity-20" style={{ color: 'hsl(132,46%,33%)' }} />
                    </div>
                  )}
                </div>
                <div className="meta">
                  <h3 onClick={() => navigate(`/story/${story._id}`)} className="cursor-pointer hover:text-[hsl(132,46%,33%)]">
                    {story.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p>
                      <Badge variant="secondary" className="text-xs mr-1">{story.age_range}</Badge>
                      <Badge variant="secondary" className="text-xs">{story.page_count} pages</Badge>
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors p-1"
                          data-testid={`library-delete-story-${story._id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Story?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{story.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(story._id)}
                            className="bg-[hsl(var(--destructive))] text-white"
                            data-testid="library-delete-confirm"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ───
function App() {
  return (
    <Router>
      <UserProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<StoryCreatorPage />} />
          <Route path="/story/:id" element={<StoryViewerPage />} />
          <Route path="/library" element={<LibraryPage />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </UserProvider>
    </Router>
  );
}

export default App;
