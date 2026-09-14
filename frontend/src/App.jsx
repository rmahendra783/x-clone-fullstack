import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Repeat2, Trash2, LogOut } from 'lucide-react';

const BASE_URL = 'http://localhost:3000/api/v1';

export default function App() {
  // 1. Auth & Session State
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth Form State (Login / Signup toggle)
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // App & Feed State
  const [tweets, setTweets] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  // 2. Lifecycle: Fetch feed when token or mount changes
  useEffect(() => {
    loadTweets();
  }, [token]);

  // Helper for Auth headers
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

  // GET Request: Load timeline
  const loadTweets = async () => {
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

  // POST Request: Auth (Login or Signup)
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

  // Logout handler
  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // POST Request: Create Tweet
  const handleCreateTweet = async (e) => {
    e.preventDefault();
    if (!content.trim() || !token) return;

    try {
      const res = await fetch(`${BASE_URL}/tweets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tweet: {
            content: content.trim(),
          },
        }),
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

  // DELETE Request: Delete Tweet
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

  // POST Request: Toggle Like
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

    // Optimistic UI update
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
        loadTweets();
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      loadTweets();
    }
  };

  // 3. Render Authentication Screen if not logged in
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

  // 4. Render Main Timeline when Authenticated
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', minHeight: '100vh' }}>
      {/* Sticky Top Header */}
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: '#ffffffcc', backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Home</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: '600' }}>@{currentUser?.username}</span>
          <button
            onClick={handleLogout}
            title="Log Out"
            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Tweet Composer */}
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

      {/* Feed Stream */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Loading feed...</p>
      ) : (
        <div>
          {tweets.map((tweet) => {
            const isLiked = tweet.liked_by_current_user || false;
            const isAuthor = currentUser && tweet.username === currentUser.username;

            return (
              <article key={tweet.id} style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                  {tweet.username ? tweet.username[0].toUpperCase() : 'U'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>@{tweet.username}</span>
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