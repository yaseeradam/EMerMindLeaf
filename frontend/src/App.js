import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, BookOpen, Plus, Library as LibraryIcon, Coins, ChevronLeft, ChevronRight, Play, Pause, Square, Download, Trash2, Menu, X, Sparkles, Palette, LogOut, Shield, User, CreditCard } from 'lucide-react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Card, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Progress } from './components/ui/progress';
import { Skeleton } from './components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ─── AUTH CONTEXT ───
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(null);

  const apiCall = useCallback(async (path, options = {}) => {
    const token = tokenRef.current;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });

    // Auto-refresh on 401
    if (res.status === 401 && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        tokenRef.current = data.access_token;
        setAccessToken(data.access_token);
        setUser(data.user);
        headers['Authorization'] = `Bearer ${data.access_token}`;
        res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
      } else {
        setUser(null);
        setAccessToken(null);
        tokenRef.current = null;
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }
    return res;
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const api = useCallback({
    get: async (path) => { const res = await apiCall(path); return res.json(); },
    post: async (path, data) => { const res = await apiCall(path, { method: 'POST', body: JSON.stringify(data) }); return res.json(); },
    del: async (path) => { const res = await apiCall(path, { method: 'DELETE' }); return res.json(); },
    getBlob: async (path) => { const res = await apiCall(path); return res.blob(); },
  }, [apiCall]);

  // Try refresh on mount
  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          tokenRef.current = data.access_token;
          setAccessToken(data.access_token);
          setUser(data.user);
        }
      } catch (e) { /* not logged in */ }
      setLoading(false);
    };
    tryRefresh();
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    tokenRef.current = data.access_token;
    setAccessToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (display_name, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name, email, password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    tokenRef.current = data.access_token;
    setAccessToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    tokenRef.current = null;
    setAccessToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.get('/api/user/me');
      setUser(data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout, api, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Protected Route ───
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-container"><Skeleton className="h-8 w-48" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// ─── Navbar ───
function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" data-testid="navbar">
      <Link to="/" className="mindleaf-logo" data-testid="navbar-logo">
        <Leaf className="leaf-icon" style={{ color: 'hsl(132, 46%, 33%)' }} />
        <span>MindLeaf</span>
      </Link>

      {user && (
        <>
          <div className="hidden md:flex items-center gap-5">
            <Link to="/" className="text-sm font-medium hover:text-[hsl(132,46%,33%)] transition-colors" data-testid="nav-home">Home</Link>
            <Link to="/library" className="text-sm font-medium hover:text-[hsl(132,46%,33%)] transition-colors" data-testid="nav-library">Library</Link>
            <Link to="/create" className="text-sm font-medium hover:text-[hsl(132,46%,33%)] transition-colors" data-testid="nav-create">New Story</Link>
            <Link to="/buy-credits" className="text-sm font-medium hover:text-[hsl(132,46%,33%)] transition-colors" data-testid="nav-buy-credits">Buy Credits</Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="text-sm font-medium hover:text-[hsl(132,46%,33%)] transition-colors" data-testid="nav-admin">
                <Shield size={14} className="inline mr-1" />Admin
              </Link>
            )}
            <div className="credit-badge" data-testid="nav-credits">
              <Coins size={16} />{user.credits ?? 0} cr
            </div>
            <button onClick={handleLogout} className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors flex items-center gap-1" data-testid="nav-logout">
              <LogOut size={16} />
            </button>
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <AnimatePresence>
            {mobileOpen && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 left-0 right-0 bg-white border-b border-[hsl(var(--border))] p-4 flex flex-col gap-3 md:hidden z-50 shadow-lg">
                <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium p-2">Home</Link>
                <Link to="/library" onClick={() => setMobileOpen(false)} className="text-sm font-medium p-2">Library</Link>
                <Link to="/create" onClick={() => setMobileOpen(false)} className="text-sm font-medium p-2">New Story</Link>
                <Link to="/buy-credits" onClick={() => setMobileOpen(false)} className="text-sm font-medium p-2">Buy Credits</Link>
                {user.role === 'admin' && <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-sm font-medium p-2"><Shield size={14} className="inline mr-1" />Admin</Link>}
                <div className="credit-badge"><Coins size={16} /> {user.credits ?? 0} credits</div>
                <button onClick={handleLogout} className="text-sm font-medium p-2 text-red-500 text-left">Logout</button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </nav>
  );
}

// ─── Login Page ───
function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'hsl(var(--background))' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf size={36} style={{ color: 'hsl(132, 46%, 33%)' }} />
            <span className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'hsl(132, 46%, 33%)' }}>MindLeaf</span>
          </div>
          <p className="text-[hsl(var(--muted-foreground))]">Sign in to your storytelling adventure</p>
        </div>
        <Card className="border-[hsl(var(--border))] shadow-[var(--shadow-soft)]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required data-testid="login-email" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required data-testid="login-password" />
              </div>
              <Button type="submit" className="w-full rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white" disabled={loading} data-testid="login-submit">
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <p className="text-center text-sm mt-4 text-[hsl(var(--muted-foreground))]">
              Don't have an account? <Link to="/register" className="text-[hsl(132,46%,33%)] font-medium hover:underline" data-testid="login-register-link">Create one</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Register Page ───
function RegisterPage() {
  const { register: doRegister, user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await doRegister(displayName, email, password);
      toast.success('Welcome to MindLeaf! You got 5 free credits!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'hsl(var(--background))' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf size={36} style={{ color: 'hsl(132, 46%, 33%)' }} />
            <span className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'hsl(132, 46%, 33%)' }}>MindLeaf</span>
          </div>
          <p className="text-[hsl(var(--muted-foreground))]">Create your account and start telling stories</p>
        </div>
        <Card className="border-[hsl(var(--border))] shadow-[var(--shadow-soft)]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Display Name</label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your child's name" required data-testid="register-name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required data-testid="register-email" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required data-testid="register-password" />
              </div>
              <Button type="submit" className="w-full rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white" disabled={loading} data-testid="register-submit">
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
            <p className="text-center text-sm mt-4 text-[hsl(var(--muted-foreground))]">
              Already have an account? <Link to="/login" className="text-[hsl(132,46%,33%)] font-medium hover:underline" data-testid="register-login-link">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Home Dashboard ───
function HomePage() {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [recentStories, setRecentStories] = useState([]);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const data = await api.get('/api/stories');
        setRecentStories((data.stories || []).slice(0, 3));
      } catch {}
    };
    fetchRecent();
  }, [api]);

  return (
    <div className="page-container" data-testid="home-page">
      <div className="bento-grid">
        {/* Greeting + Actions */}
        <motion.div className="bento-card md:col-span-7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Hello, {user?.display_name || 'Reader'}!
              </h1>
              <p className="text-[hsl(var(--muted-foreground))] mt-2">What magical story shall we create today?</p>
            </div>
            <Leaf size={40} className="opacity-10" style={{ color: 'hsl(132,46%,33%)' }} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-soft)] hover:opacity-90 active:scale-95 transition-transform" onClick={() => navigate('/create')} data-testid="home-new-story-button">
              <Plus size={18} className="mr-2" />New Story
            </Button>
            <Button size="lg" variant="outline" className="rounded-[var(--radius-btn)] border-[hsl(var(--border))] hover:bg-white" onClick={() => navigate('/library')} data-testid="home-library-button">
              <LibraryIcon size={18} className="mr-2" />My Library
            </Button>
            <Button size="lg" variant="outline" className="rounded-[var(--radius-btn)] border-[hsl(var(--border))] hover:bg-white" onClick={() => navigate('/buy-credits')} data-testid="home-buy-credits-button">
              <CreditCard size={18} className="mr-2" />Buy Credits
            </Button>
            {user?.role === 'admin' && (
              <Button size="lg" variant="outline" className="rounded-[var(--radius-btn)] border-[hsl(var(--border))] hover:bg-white" onClick={() => navigate('/admin')} data-testid="home-admin-button">
                <Shield size={18} className="mr-2" />Admin Panel
              </Button>
            )}
          </div>
        </motion.div>

        {/* Credits */}
        <motion.div className="bento-card md:col-span-5" style={{ borderTop: '3px solid hsl(var(--brand-orange))' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your Credits</h2>
            <Coins size={20} style={{ color: 'hsl(var(--brand-orange))' }} />
          </div>
          <div className="text-4xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', monospace", color: 'hsl(var(--brand-orange))' }} data-testid="home-credit-balance">
            {user?.credits ?? 0}
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">credits remaining</p>
          <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-1">
            <p>Short story: 1 credit &middot; Medium: 2 credits</p>
            <p>Long story: 3 credits &middot; Extended: 5 credits</p>
          </div>
        </motion.div>

        {/* Trending Topics */}
        <motion.div className="bento-card md:col-span-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Sparkles size={18} className="inline mr-2" style={{ color: 'hsl(var(--brand-orange))' }} />Trending Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {['Space Adventure', 'Magic Forest', 'The Brave Lion', 'Ocean Mystery', 'African Folklore'].map(topic => (
              <button key={topic} className="topic-chip" onClick={() => navigate('/create', { state: { topic } })} data-testid={`trending-topic-${topic.toLowerCase().replace(/\s+/g, '-')}`}>
                {topic}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Stories */}
        {recentStories.length > 0 && (
          <motion.div className="bento-card md:col-span-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recent Stories</h2>
              <Link to="/library" className="text-sm text-[hsl(132,46%,33%)] font-medium hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recentStories.map(story => (
                <div key={story._id} className="story-card" onClick={() => navigate(`/story/${story._id}`)} data-testid={`recent-story-${story._id}`}>
                  <div className="cover">
                    {story.cover_image ? (
                      <img src={`data:image/jpeg;base64,${story.cover_image}`} alt={story.title} />
                    ) : (
                      <div className="flex items-center justify-center h-full"><Leaf size={40} className="opacity-20" style={{ color: 'hsl(132,46%,33%)' }} /></div>
                    )}
                  </div>
                  <div className="meta">
                    <h3>{story.title}</h3>
                    <p><Badge variant="secondary" className="text-xs">{story.age_range}</Badge></p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
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
  'Crafting the characters...',
  'Writing the adventure...',
  'Painting the cover page...',
  'Creating illustrations...',
  'Adding final details...',
  'Almost ready!',
];

function StoryCreatorPage() {
  const navigate = useNavigate();
  const { user, api, refreshUser } = useAuth();
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

  useEffect(() => {
    const state = window.history.state?.usr;
    if (state?.topic) setTopic(state.topic);
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const stepInterval = setInterval(() => { setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1)); }, 10000);
    const progressInterval = setInterval(() => { setProgress(prev => Math.min(prev + 0.5, 95)); }, 500);
    return () => { clearInterval(stepInterval); clearInterval(progressInterval); };
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error('Please enter a topic for your story'); return; }
    const cost = LENGTHS.find(l => l.value === length)?.credits || 1;
    if ((user?.credits ?? 0) < cost) { toast.error(`Not enough credits. You need ${cost} but have ${user?.credits ?? 0}`); return; }

    setIsGenerating(true);
    setLoadingStep(0);
    setProgress(0);

    try {
      const story = await api.post('/api/stories/generate', {
        topic: topic.trim(), age_range: ageRange, subject, length, art_style: artStyle,
        character_traits: characterTraits || null, setting_details: settingDetails || null,
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
      <AnimatePresence>
        {isGenerating && (
          <motion.div className="loading-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="story-loading-overlay">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <Leaf size={60} style={{ color: 'hsl(132, 46%, 33%)' }} />
            </motion.div>
            <p className="step-text mt-6" data-testid="loading-step-text">{LOADING_STEPS[loadingStep]}</p>
            <p className="sub-text">Creating a magical story just for you...</p>
            <div className="w-64 mt-6"><Progress value={progress} className="h-2" /></div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">{Math.round(progress)}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-container" data-testid="story-creator-page">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create a New Story</h1>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">Fill in the details and let AI create a magical story for you!</p>
          </motion.div>

          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <label className="text-sm font-semibold mb-3 block">Topic</label>
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What should the story be about?" className="text-base mb-3" data-testid="story-creator-topic-input" />
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => (<button key={t} className={`topic-chip ${topic === t ? 'selected' : ''}`} onClick={() => setTopic(t)} data-testid={`story-creator-topic-chip-${t.toLowerCase().replace(/\s+/g, '-')}`}>{t}</button>))}
            </div>
          </motion.section>

          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <label className="text-sm font-semibold mb-3 block">Age Range</label>
            <div className="flex gap-3">
              {AGE_RANGES.map(age => (
                <button key={age} className={`selection-card flex-1 text-center ${ageRange === age ? 'selected' : ''}`} onClick={() => setAgeRange(age)} data-testid={`story-creator-age-${age}`}>
                  <div className="text-lg font-bold">{age}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">years</div>
                </button>
              ))}
            </div>
          </motion.section>

          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <label className="text-sm font-semibold mb-3 block">Subject</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="w-full" data-testid="story-creator-subject-select"><SelectValue /></SelectTrigger>
              <SelectContent>{SUBJECTS.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
            </Select>
          </motion.section>

          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <label className="text-sm font-semibold mb-3 block">Story Length</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LENGTHS.map(l => (
                <button key={l.value} className={`selection-card text-center ${length === l.value ? 'selected' : ''}`} onClick={() => setLength(l.value)} data-testid={`story-creator-length-${l.value}`}>
                  <span className="cost-badge">{l.credits}cr</span>
                  <div className="text-lg font-bold mt-1">{l.label}</div><div className="text-xs text-[hsl(var(--muted-foreground))]">{l.pages} pages</div>
                </button>
              ))}
            </div>
          </motion.section>

          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <label className="text-sm font-semibold mb-3 block">Art Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ART_STYLES.map(style => (
                <button key={style.value} className={`art-style-card ${artStyle === style.value ? 'selected' : ''}`} onClick={() => setArtStyle(style.value)} data-testid={`story-creator-art-${style.value}`}>
                  <div className="art-icon" style={{ color: artStyle === style.value ? 'hsl(132,46%,33%)' : 'hsl(var(--muted-foreground))' }}>{style.icon}</div>
                  <div className="text-sm font-medium">{style.label}</div>
                </button>
              ))}
            </div>
          </motion.section>

          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <label className="text-sm font-semibold mb-3 block">Character Traits (optional)</label>
            <Input value={characterTraits} onChange={e => setCharacterTraits(e.target.value)} placeholder="e.g., brave, curious, kind-hearted" className="mb-4" data-testid="story-creator-traits-input" />
            <label className="text-sm font-semibold mb-3 block">Setting Details (optional)</label>
            <Textarea value={settingDetails} onChange={e => setSettingDetails(e.target.value)} placeholder="e.g., a magical kingdom on top of the clouds" data-testid="story-creator-setting-input" />
          </motion.section>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[hsl(var(--muted))] mb-4">
              <span className="text-sm">Cost: <strong>{selectedLength?.credits || 1} credit{(selectedLength?.credits || 1) > 1 ? 's' : ''}</strong></span>
              <span className="text-sm">Balance: <strong className="credit-badge">{user?.credits ?? 0}</strong></span>
            </div>
            <Button size="lg" className="w-full rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-soft)] hover:opacity-90 active:scale-95 transition-transform text-base py-6" onClick={handleGenerate} disabled={isGenerating} data-testid="story-creator-generate-button">
              <Sparkles size={20} className="mr-2" />Generate Story
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
  const { api } = useAuth();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 0 = cover
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
      } finally { setLoading(false); }
    };
    loadStory();
  }, [id, navigate, api]);

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

  const totalPages = (story?.pages?.length || 0) + 1; // +1 for cover

  const handlePlay = () => {
    if (currentPage === 0) return; // No text on cover
    const pageIdx = currentPage - 1;
    if (!story?.pages?.[pageIdx]) return;

    if (isPlaying) { speechSynth.cancel(); setIsPlaying(false); return; }

    const utterance = new SpeechSynthesisUtterance(story.pages[pageIdx].text);
    const voice = availableVoices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    speechSynth.speak(utterance);
    setIsPlaying(true);
  };

  const handleStop = () => { speechSynth.cancel(); setIsPlaying(false); };

  const handleExportPDF = async () => {
    try {
      toast.info('Generating PDF...');
      const blob = await api.getBlob(`/api/stories/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story?.title || 'story'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch { toast.error('Failed to export PDF'); }
  };

  const goToPage = (page) => {
    if (page >= 0 && page < totalPages) {
      speechSynth.cancel(); setIsPlaying(false); setCurrentPage(page);
    }
  };

  if (loading) return <div className="page-container"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-[500px] w-full max-w-3xl mx-auto rounded-2xl" /></div>;
  if (!story) return null;

  const isOnCover = currentPage === 0;
  const storyPage = !isOnCover ? story.pages?.[currentPage - 1] : null;

  return (
    <div className="page-container" data-testid="story-viewer-page">
      <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/library')} data-testid="story-viewer-back-button"><ChevronLeft size={20} /></Button>
          <h1 className="text-xl sm:text-2xl font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{story.title}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleExportPDF} data-testid="story-viewer-export-pdf-button" title="Export PDF"><Download size={18} /></Button>
      </div>

      {/* TTS Controls (only on story pages, not cover) */}
      {!isOnCover && (
        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="w-48" data-testid="story-viewer-tts-voice-select"><SelectValue placeholder="Select voice" /></SelectTrigger>
            <SelectContent>{availableVoices.map(v => (<SelectItem key={v.name} value={v.name}>{v.name.split(' ').slice(0, 3).join(' ')}</SelectItem>))}</SelectContent>
          </Select>
          <Button variant={isPlaying ? 'default' : 'outline'} size="sm" onClick={handlePlay} className="rounded-full" data-testid="story-viewer-tts-play-button">
            {isPlaying ? <Pause size={16} className="mr-1" /> : <Play size={16} className="mr-1" />}{isPlaying ? 'Pause' : 'Play'}
          </Button>
          {isPlaying && <Button variant="ghost" size="sm" onClick={handleStop} className="rounded-full" data-testid="story-viewer-tts-stop-button"><Square size={16} className="mr-1" /> Stop</Button>}
        </div>
      )}

      {/* Book Canvas */}
      <div className="book-canvas" data-testid="story-viewer-book-canvas">
        <AnimatePresence mode="wait">
          <motion.div key={currentPage} className="book-page" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {isOnCover ? (
              /* Cover Page */
              <div className="cover-page" data-testid="story-viewer-cover-page">
                <div className="illustration" style={{ aspectRatio: '16/10' }}>
                  {story.cover_image ? (
                    <img src={`data:image/jpeg;base64,${story.cover_image}`} alt="Cover" data-testid="story-viewer-cover-image" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, hsl(132,46%,90%), hsl(33,100%,90%))' }}>
                      <Leaf size={64} style={{ color: 'hsl(132,46%,33%)', opacity: 0.3 }} />
                    </div>
                  )}
                </div>
                <div className="text-center mt-6 mb-4">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{story.title}</h2>
                  <p className="text-[hsl(var(--muted-foreground))]">A {story.subject} story for ages {story.age_range}</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Badge variant="secondary">{story.age_range}</Badge>
                    <Badge variant="secondary">{story.subject}</Badge>
                    <Badge variant="secondary">{story.pages?.length || 0} pages</Badge>
                  </div>
                </div>
              </div>
            ) : (
              /* Story Page */
              <>
                <div className="illustration">
                  {storyPage?.image_base64 ? (
                    <img src={`data:image/jpeg;base64,${storyPage.image_base64}`} alt={`Page ${currentPage}`} data-testid="story-viewer-illustration" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-[hsl(var(--muted-foreground))]">
                      <Leaf size={48} className="opacity-30 mb-2" /><p className="text-sm">Illustration unavailable</p>
                    </div>
                  )}
                </div>
                <div className="page-text" data-testid="story-viewer-page-text">{storyPage?.text}</div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between p-4 border-t border-[hsl(var(--border))]">
          <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0} data-testid="story-viewer-prev-page-button">
            <ChevronLeft size={18} className="mr-1" /> Previous
          </Button>
          <span className="page-indicator" data-testid="story-viewer-page-indicator">
            {isOnCover ? 'Cover' : `${currentPage} / ${story.pages?.length || 0}`}
          </span>
          <Button variant="ghost" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages - 1} data-testid="story-viewer-next-page-button">
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
  const { api } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      const data = await api.get('/api/stories');
      setStories(data.stories || []);
    } catch { toast.error('Failed to load stories'); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleDelete = async (storyId) => {
    try {
      await api.del(`/api/stories/${storyId}`);
      setStories(prev => prev.filter(s => s._id !== storyId));
      toast.success('Story deleted');
    } catch { toast.error('Failed to delete story'); }
  };

  if (loading) return <div className="page-container"><Skeleton className="h-8 w-48 mb-6" /><div className="library-grid">{[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div></div>;

  return (
    <div className="page-container" data-testid="library-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>My Library</h1>
        <Button className="rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white" onClick={() => navigate('/create')} data-testid="library-new-story-button">
          <Plus size={18} className="mr-2" /> New Story
        </Button>
      </div>

      {stories.length === 0 ? (
        <div className="empty-state" data-testid="library-empty-state">
          <BookOpen size={64} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
          <p className="text-sm mb-4">Create your first magical story!</p>
          <Button onClick={() => navigate('/create')} className="rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white"><Plus size={18} className="mr-2" /> Create Story</Button>
        </div>
      ) : (
        <div className="library-grid" data-testid="library-grid">
          {stories.map((story, idx) => (
            <motion.div key={story._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <div className="story-card" data-testid={`library-story-card-${story._id}`}>
                <div className="cover" onClick={() => navigate(`/story/${story._id}`)} data-testid={`library-story-open-${story._id}`}>
                  {story.cover_image ? (
                    <img src={`data:image/jpeg;base64,${story.cover_image}`} alt={story.title} />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Leaf size={40} className="opacity-20" style={{ color: 'hsl(132,46%,33%)' }} /></div>
                  )}
                </div>
                <div className="meta">
                  <h3 onClick={() => navigate(`/story/${story._id}`)} className="cursor-pointer hover:text-[hsl(132,46%,33%)]">{story.title}</h3>
                  <div className="flex items-center justify-between">
                    <p><Badge variant="secondary" className="text-xs mr-1">{story.age_range}</Badge><Badge variant="secondary" className="text-xs">{story.page_count} pages</Badge></p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors p-1" data-testid={`library-delete-story-${story._id}`}><Trash2 size={16} /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Story?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{story.title}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(story._id)} className="bg-[hsl(var(--destructive))] text-white" data-testid="library-delete-confirm">Delete</AlertDialogAction></AlertDialogFooter>
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

// ─── Buy Credits ───
const PACKAGES = [
  { id: 'starter', name: 'Starter Pack', credits: 10, price: 500, popular: false },
  { id: 'value', name: 'Value Pack', credits: 25, price: 1000, popular: true },
  { id: 'premium', name: 'Premium Pack', credits: 60, price: 2000, popular: false },
  { id: 'mega', name: 'Mega Pack', credits: 150, price: 4000, popular: false },
];

function BuyCreditsPage() {
  const { api, refreshUser } = useAuth();
  const [processingId, setProcessingId] = useState(null);

  const handleBuy = async (pkg) => {
    setProcessingId(pkg.id);
    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const data = await api.post('/api/payments/paystack/init', { package_id: pkg.id, callback_url: callbackUrl });
      window.location.href = data.authorization_url;
    } catch (err) {
      toast.error(err.message || 'Payment initialization failed');
      setProcessingId(null);
    }
  };

  return (
    <div className="page-container" data-testid="buy-credits-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-semibold tracking-tight mb-2 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Buy Credits</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-8 text-center">Choose a pack that works for you</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {PACKAGES.map((pkg, idx) => (
          <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
            <Card className={`relative overflow-hidden ${pkg.popular ? 'border-[hsl(var(--brand-orange))] border-2' : 'border-[hsl(var(--border))]'}`} data-testid={`credits-package-${pkg.id}`}>
              {pkg.popular && (
                <div className="absolute top-0 left-0 right-0 py-1 text-center text-xs font-bold text-white" style={{ background: 'hsl(var(--brand-orange))' }}>Most Popular</div>
              )}
              <CardContent className={`p-6 text-center ${pkg.popular ? 'pt-10' : ''}`}>
                <Coins size={32} className="mx-auto mb-3" style={{ color: 'hsl(var(--brand-orange))' }} />
                <h3 className="text-lg font-semibold mb-1">{pkg.name}</h3>
                <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', monospace", color: 'hsl(var(--brand-green))' }}>{pkg.credits}</div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">credits</p>
                <div className="text-2xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  &#8358;{pkg.price.toLocaleString()}
                </div>
                <Button className="w-full rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] text-white" onClick={() => handleBuy(pkg)} disabled={processingId === pkg.id} data-testid={`credits-buy-${pkg.id}`}>
                  {processingId === pkg.id ? 'Processing...' : 'Buy Now'}
                </Button>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3 flex items-center justify-center gap-1">
                  <CreditCard size={12} /> Secure payment via Paystack
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Payment Callback ───
function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { api, refreshUser } = useAuth();
  const [status, setStatus] = useState('verifying');
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  useEffect(() => {
    const verify = async () => {
      if (!reference) { setStatus('failed'); return; }
      try {
        const data = await api.get(`/api/payments/paystack/verify/${reference}`);
        if (data.status === 'success') {
          setStatus('success');
          await refreshUser();
          toast.success(`${data.credits} credits added!`);
          setTimeout(() => navigate('/'), 2000);
        } else {
          setStatus('failed');
        }
      } catch { setStatus('failed'); }
    };
    verify();
  }, [reference, api, refreshUser, navigate]);

  return (
    <div className="page-container text-center" data-testid="payment-callback-page">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        {status === 'verifying' && <><div className="spinner mx-auto mb-4" style={{ width: 40, height: 40, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--brand-green))', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><p className="text-lg font-semibold">Verifying payment...</p></>}
        {status === 'success' && <><div className="text-5xl mb-4" style={{ color: 'hsl(var(--brand-green))' }}>&#10003;</div><p className="text-lg font-semibold">Payment Successful!</p><p className="text-[hsl(var(--muted-foreground))]">Credits added. Redirecting...</p></>}
        {status === 'failed' && <><div className="text-5xl mb-4" style={{ color: 'hsl(var(--destructive))' }}>&#10007;</div><p className="text-lg font-semibold">Payment Failed</p><p className="text-[hsl(var(--muted-foreground))] mb-4">Something went wrong.</p><Button onClick={() => navigate('/buy-credits')}>Try Again</Button></>}
      </motion.div>
    </div>
  );
}

// ─── Admin Dashboard ───
function AdminPage() {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grantDialog, setGrantDialog] = useState(null);
  const [grantAmount, setGrantAmount] = useState('10');
  const [roleDialog, setRoleDialog] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get('/api/admin/users');
      setUsers(data.users || []);
    } catch (err) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleGrantCredits = async () => {
    if (!grantDialog) return;
    try {
      await api.post(`/api/admin/users/${grantDialog._id}/credits`, { credits: parseInt(grantAmount) });
      toast.success(`Granted ${grantAmount} credits`);
      setGrantDialog(null);
      fetchUsers();
    } catch (err) { toast.error(err.message); }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.post(`/api/admin/users/${userId}/role`, { role: newRole });
      toast.success(`Role changed to ${newRole}`);
      setRoleDialog(null);
      fetchUsers();
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="page-container"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64" /></div>;

  return (
    <div className="page-container" data-testid="admin-page">
      <h1 className="text-3xl font-semibold tracking-tight mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Admin Dashboard</h1>

      <Card className="border-[hsl(var(--border))]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Stories</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u._id} data-testid={`admin-user-row-${u._id}`}>
                  <TableCell className="font-medium">{u.display_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge></TableCell>
                  <TableCell><span className="font-mono font-bold">{u.credits ?? 0}</span></TableCell>
                  <TableCell>{u.story_count ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setGrantDialog(u); setGrantAmount('10'); }} data-testid={`admin-grant-credits-${u._id}`}>
                        <Coins size={14} className="mr-1" /> Grant
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setRoleDialog(u)} data-testid={`admin-change-role-${u._id}`}>
                        <Shield size={14} className="mr-1" /> Role
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grant Credits Dialog */}
      <Dialog open={!!grantDialog} onOpenChange={() => setGrantDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grant Credits to {grantDialog?.display_name}</DialogTitle></DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Number of credits</label>
            <Input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} min="1" data-testid="admin-grant-credits-input" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialog(null)}>Cancel</Button>
            <Button onClick={handleGrantCredits} className="bg-[hsl(var(--primary))] text-white" data-testid="admin-grant-credits-confirm">Grant Credits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Role for {roleDialog?.display_name}</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm mb-4">Current role: <Badge>{roleDialog?.role}</Badge></p>
            <div className="flex gap-3">
              <Button variant={roleDialog?.role === 'user' ? 'default' : 'outline'} onClick={() => handleChangeRole(roleDialog?._id, 'user')} data-testid="admin-role-user">User</Button>
              <Button variant={roleDialog?.role === 'admin' ? 'default' : 'outline'} onClick={() => handleChangeRole(roleDialog?._id, 'admin')} data-testid="admin-role-admin">Admin</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main App ───
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/create" element={<ProtectedRoute><StoryCreatorPage /></ProtectedRoute>} />
      <Route path="/story/:id" element={<ProtectedRoute><StoryViewerPage /></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
      <Route path="/buy-credits" element={<ProtectedRoute><BuyCreditsPage /></ProtectedRoute>} />
      <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallbackPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </Router>
  );
}

export default App;
