import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Repeat2, Trash2, LogOut, ArrowLeft, Calendar } from 'lucide-react';

const BASE_URL = 'http://localhost:3000/api/v1';

export default function App() {
  // 1. Auth & Session State
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth Form State
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Feed & Navigation State
  const [tweets, setTweets] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingProfile, setViewingProfile] = useState(null); // null = Home, string = username
  const [profileData, setProfileData] = useState(null);

  // 2. Lifecycle: Load feed or profile when view/token changes
  useEffect(() => {
    if (viewingProfile) {
      loadUserProfile(viewingProfile);
    } else {
      loadTweets();
    }
  }, [token, viewingProfile]);

  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // GET: Global Timeline
  const loadTweets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/tweets`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTweets(data);
      }
    } catch (err) {
      console.error('Failed to fetch tweets:', err);
    } finally {
      setLoading(false);
    }
  };

  // GET: User Profile & Specific Tweets
  const loadUserProfile = async (username) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users/${username}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.user);
        setTweets(data.tweets);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // POST: Login / Signup
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    const endpoint = isLoginView ? `${BASE_URL}/auth/login` : `${BASE_URL}/auth/signup`;
    const payload = isLoginView
      ? { username: authForm.username, password: authForm.password }
      : { user: { username: authForm.username, email: authForm.email, password: authForm.password } };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthForm({ username: '', email: '', password: '' });
      } else {
        setAuthError(data.error || (data.errors ? data.errors.join(', ') : 'Authentication failed'));
      }
    } catch (err) {
      setAuthError('Server unreachable. Please check backend.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    setViewingProfile(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // POST: Create Tweet
  const handleCreateTweet = async (e) => {
    e.preventDefault();
    if (!content.trim() || !token) return;

    try {
      const res = await fetch(`${BASE_URL}/tweets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tweet: { content: content.trim() } }),
      });

      if (res.ok) {
        const newTweet = await res.json();
        setTweets([newTweet, ...tweets]);
        setContent('');
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Error posting tweet:', err);
    }
  };

  // DELETE: Remove Tweet
  const handleDeleteTweet = async (id) => {
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/tweets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        setTweets(tweets.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting tweet:', err);
    }
  };

  // POST: Like / Unlike Toggle
  const handleLikeTweet = async (id) => {
    if (!token) {
      alert('Please log in to like tweets.');
      return;
    }

    const targetTweet = tweets.find((t) => t.id === id);
    if (!targetTweet) return;

    const isCurrentlyLiked = targetTweet.liked_by_current_user || false;
    const optimisticCount = isCurrentlyLiked
      ? Math.max(0, (targetTweet.likes_count || 0) - 1)
      : (targetTweet.likes_count || 0) + 1;

    setTweets(
      tweets.map((t) =>
        t.id === id
          ? {
              ...t,
              likes_count: optimisticCount,
              liked_by_current_user: !isCurrentlyLiked,
            }
          : t
      )
    );

    try {
      const res = await fetch(`${BASE_URL}/tweets/${id}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setTweets((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  likes_count: data.likes_count,
                  liked_by_current_user: data.liked,
                }
              : t
          )
        );
      } else {
        viewingProfile ? loadUserProfile(viewingProfile) : loadTweets();
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      viewingProfile ? loadUserProfile(viewingProfile) : loadTweets();
    }
  };

  // 3. Auth Form View
  if (!token) {
    return (
      <div style={{ maxWidth: '420px', margin: '80px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', border: '1px solid #e5e7eb', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>
          {isLoginView ? 'Sign in to X' : 'Create your account'}
        </h2>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          {isLoginView ? 'Welcome back!' : 'Join the conversation today.'}
        </p>

        {authError && (
          <div style={{ padding: '10px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Username"
            required
            value={authForm.username}
            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
            style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
          />

          {!isLoginView && (
            <input
              type="email"
              placeholder="Email address"
              required
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
            />
          )}

          <input
            type="password"
            placeholder="Password"
            required
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
          />

          <button
            type="submit"
            style={{
              padding: '12px',
              backgroundColor: '#0f1419',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            {isLoginView ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
          {isLoginView ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setAuthError('');
            }}
            style={{ color: '#1d9bf0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLoginView ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    );
  }

  // 4. Main Authenticated View
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', minHeight: '100vh' }}>
      {/* Top Header */}
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: '#ffffffcc', backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {viewingProfile && (
            <button
              onClick={() => setViewingProfile(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              {viewingProfile ? profileData?.username : 'Home'}
            </h1>
            {viewingProfile && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {profileData?.tweets_count || 0} Tweets
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setViewingProfile(currentUser.username)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#1d9bf0' }}
          >
            @{currentUser?.username}
          </button>
          <button
            onClick={handleLogout}
            title="Log Out"
            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Conditional: Profile Header Banner OR Tweet Composer */}
      {viewingProfile ? (
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#fff', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {profileData?.username ? profileData.username[0].toUpperCase() : 'U'}
            </div>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '12px 0 2px 0' }}>
            {profileData?.username}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 12px 0' }}>
            @{profileData?.username}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px' }}>
            <Calendar size={14} />
            <span>
              Joined {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateTweet} style={{ padding: '16px', borderBottom: '8px solid #f3f4f6' }}>
          <textarea
            rows="3"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What is happening?!"
            maxLength={280}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '18px', resize: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: content.length > 250 ? 'red' : '#6b7280' }}>
              {280 - content.length} characters left
            </span>
            <button
              type="submit"
              disabled={!content.trim()}
              style={{
                backgroundColor: '#1d9bf0',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontWeight: 'bold',
                cursor: content.trim() ? 'pointer' : 'not-allowed',
                opacity: content.trim() ? 1 : 0.6,
              }}
            >
              Post
            </button>
          </div>
        </form>
      )}

      {/* Feed Stream */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Loading...</p>
      ) : tweets.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>No tweets found.</p>
      ) : (
        <div>
          {tweets.map((tweet) => {
            const isLiked = tweet.liked_by_current_user || false;
            const isAuthor = currentUser && tweet.username === currentUser.username;

            return (
              <article key={tweet.id} style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '12px' }}>
                <div
                  onClick={() => setViewingProfile(tweet.username)}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, cursor: 'pointer' }}
                >
                  {tweet.username ? tweet.username[0].toUpperCase() : 'U'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setViewingProfile(tweet.username)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', color: 'inherit' }}
                    >
                      @{tweet.username}
                    </button>
                    {isAuthor && (
                      <button
                        onClick={() => handleDeleteTweet(tweet.id)}
                        title="Delete Tweet"
                        style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p style={{ margin: '6px 0 12px 0', fontSize: '15px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                    {tweet.content}
                  </p>
                  <div style={{ display: 'flex', gap: '32px', color: '#6b7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <MessageCircle size={16} /> 0
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <Repeat2 size={16} /> 0
                    </span>
                    <button
                      onClick={() => handleLikeTweet(tweet.id)}
                      title={isLiked ? 'Unlike' : 'Like'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        background: 'transparent',
                        border: 'none',
                        color: isLiked ? '#ef4444' : '#6b7280',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Heart
                        size={16}
                        fill={isLiked ? '#ef4444' : 'none'}
                        stroke={isLiked ? '#ef4444' : 'currentColor'}
                      />
                      {tweet.likes_count || 0}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}