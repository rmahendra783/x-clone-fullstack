import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Heart, Repeat2, Trash2, LogOut, ArrowLeft, Calendar, Loader2, Send } from 'lucide-react';

const BASE_URL = 'http://localhost:3000/api/v1';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Navigation State
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'profile'
  const [viewingProfile, setViewingProfile] = useState(null);

  // Feed & Timeline State
  const [feedTab, setFeedTab] = useState('for_you'); // 'for_you' | 'following'
  const [tweets, setTweets] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  // Inline Comment Expansion State (Maps tweet_id -> { open: bool, loading: bool, replies: [], replyText: '' })
  const [commentsMap, setCommentsMap] = useState({});

  const observerRef = useRef(null);

  const getAuthHeaders = useCallback(() => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  const loadInitialFeed = useCallback(async () => {
    setLoading(true);
    setNextCursor(null);
    try {
      const url = feedTab === 'following'
        ? `${BASE_URL}/tweets?feed=following`
        : `${BASE_URL}/tweets`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTweets(data.tweets || []);
        setNextCursor(data.next_cursor);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  }, [feedTab, getAuthHeaders]);

  const loadMoreTweets = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const url = feedTab === 'following'
        ? `${BASE_URL}/tweets?feed=following&cursor=${nextCursor}`
        : `${BASE_URL}/tweets?cursor=${nextCursor}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTweets((prev) => [...prev, ...(data.tweets || [])]);
        setNextCursor(data.next_cursor);
      }
    } catch (err) {
      console.error('Failed to load more tweets:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, feedTab, getAuthHeaders]);

  const lastTweetSentinelRef = useCallback((node) => {
    if (loading || loadingMore || currentView !== 'home') return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextCursor) {
        loadMoreTweets();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, nextCursor, currentView, loadMoreTweets]);

  const loadUserProfile = useCallback(async (username) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users/${username}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.user);
        setTweets(data.tweets || []);
        setNextCursor(null);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (currentView === 'profile' && viewingProfile) {
      loadUserProfile(viewingProfile);
    } else {
      loadInitialFeed();
    }
  }, [currentView, viewingProfile, feedTab, loadInitialFeed, loadUserProfile]);

  // Auth Handling
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
    } catch {
      setAuthError('Server unreachable. Please check backend.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    setCurrentView('home');
    setViewingProfile(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Top-Level Tweet Creation
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
        setTweets((prev) => [newTweet, ...prev]);
        setContent('');
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Error posting tweet:', err);
    }
  };

  // Toggle Inline Comments Section (FB / Insta Style)
  const toggleComments = async (tweetId) => {
    const isCurrentlyOpen = commentsMap[tweetId]?.open;

    if (isCurrentlyOpen) {
      setCommentsMap((prev) => ({
        ...prev,
        [tweetId]: { ...prev[tweetId], open: false },
      }));
      return;
    }

    // Open & Load existing comments from backend
    setCommentsMap((prev) => ({
      ...prev,
      [tweetId]: { open: true, loading: true, replies: prev[tweetId]?.replies || [], replyText: '' },
    }));

    try {
      const res = await fetch(`${BASE_URL}/tweets/${tweetId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        // Sort newest first client-side as safeguard
        const sortedReplies = (data.replies || []).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        setCommentsMap((prev) => ({
          ...prev,
          [tweetId]: {
            open: true,
            loading: false,
            replies: sortedReplies,
            replyText: prev[tweetId]?.replyText || '',
          },
        }));
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
      setCommentsMap((prev) => ({
        ...prev,
        [tweetId]: { ...prev[tweetId], loading: false },
      }));
    }
  };

  // Post Inline Comment (Prepend to top)
  const handlePostComment = async (tweetId) => {
    const commentText = commentsMap[tweetId]?.replyText?.trim();
    if (!commentText || !token) return;

    try {
      const res = await fetch(`${BASE_URL}/tweets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tweet: {
            content: commentText,
            parent_id: tweetId,
          },
        }),
      });

      if (res.ok) {
        const newReply = await res.json();

        // 1. Prepend new reply so newest appears first
        setCommentsMap((prev) => ({
          ...prev,
          [tweetId]: {
            ...prev[tweetId],
            replies: [newReply, ...(prev[tweetId]?.replies || [])],
            replyText: '',
          },
        }));

        // 2. Increment comment count on the tweet card
        setTweets((prev) =>
          prev.map((t) =>
            t.id === tweetId ? { ...t, replies_count: (t.replies_count || 0) + 1 } : t
          )
        );
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  // Like Toggle
  const handleLikeTweet = async (id) => {
    if (!token) return alert('Please log in to like tweets.');

    const updateLike = (item) => {
      if (item.id !== id) return item;
      const isLiked = item.liked_by_current_user || false;
      return {
        ...item,
        liked_by_current_user: !isLiked,
        likes_count: isLiked ? Math.max(0, (item.likes_count || 0) - 1) : (item.likes_count || 0) + 1,
      };
    };

    setTweets((prev) => prev.map(updateLike));

    // Also update likes inside expanded comments if applicable
    setCommentsMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((pid) => {
        if (updated[pid]?.replies) {
          updated[pid].replies = updated[pid].replies.map(updateLike);
        }
      });
      return updated;
    });

    try {
      const res = await fetch(`${BASE_URL}/tweets/${id}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const syncServer = (item) =>
          item.id === id ? { ...item, likes_count: data.likes_count, liked_by_current_user: data.liked } : item;

        setTweets((prev) => prev.map(syncServer));
        setCommentsMap((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((pid) => {
            if (updated[pid]?.replies) {
              updated[pid].replies = updated[pid].replies.map(syncServer);
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.error('Error liking tweet:', err);
    }
  };

  // Delete Tweet or Comment
  const handleDeleteTweet = async (id, parentId = null) => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/tweets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (parentId) {
          // It was a reply inside an expanded list
          setCommentsMap((prev) => ({
            ...prev,
            [parentId]: {
              ...prev[parentId],
              replies: prev[parentId].replies.filter((r) => r.id !== id),
            },
          }));
          setTweets((prev) =>
            prev.map((t) =>
              t.id === parentId ? { ...t, replies_count: Math.max(0, (t.replies_count || 1) - 1) } : t
            )
          );
        } else {
          setTweets((prev) => prev.filter((t) => t.id !== id));
        }
      }
    } catch (err) {
      console.error('Error deleting tweet:', err);
    }
  };

  // Follow Toggle
  const handleToggleFollow = async (targetUsername) => {
    if (!token) return alert('Please log in to follow users.');

    try {
      const res = await fetch(`${BASE_URL}/users/${targetUsername}/follow`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setProfileData((prev) => ({
          ...prev,
          is_following: data.following,
          followers_count: data.followers_count,
          following_count: data.following_count,
        }));
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const navigateToProfile = (username) => {
    setViewingProfile(username);
    setCurrentView('profile');
  };

  const navigateToHome = () => {
    setCurrentView('home');
    setViewingProfile(null);
  };

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

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: '#ffffffcc', backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {currentView === 'profile' && (
            <button
              onClick={navigateToHome}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              {currentView === 'profile' ? profileData?.username : 'Home'}
            </h1>
            {currentView === 'profile' && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {profileData?.tweets_count || 0} Tweets
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigateToProfile(currentUser.username)}
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

      {/* Profile Header or Main Feed Tabs */}
      {currentView === 'profile' ? (
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#fff', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {profileData?.username ? profileData.username[0].toUpperCase() : 'U'}
            </div>

            {currentUser && currentUser.username !== profileData?.username && (
              <button
                onClick={() => handleToggleFollow(profileData.username)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  border: profileData?.is_following ? '1px solid #cfd9de' : 'none',
                  backgroundColor: profileData?.is_following ? '#ffffff' : '#0f1419',
                  color: profileData?.is_following ? '#0f1419' : '#ffffff',
                }}
              >
                {profileData?.is_following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '12px 0 2px 0' }}>
            {profileData?.username}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 12px 0' }}>
            @{profileData?.username}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px', marginBottom: '14px' }}>
            <Calendar size={14} />
            <span>
              Joined {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '18px', fontSize: '14px' }}>
            <span><strong>{profileData?.following_count || 0}</strong> <span style={{ color: '#6b7280' }}>Following</span></span>
            <span><strong>{profileData?.followers_count || 0}</strong> <span style={{ color: '#6b7280' }}>Followers</span></span>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <button
              onClick={() => setFeedTab('for_you')}
              style={{
                flex: 1,
                padding: '14px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: feedTab === 'for_you' ? '700' : '500',
                color: feedTab === 'for_you' ? '#0f1419' : '#536471',
                position: 'relative',
                fontSize: '15px',
              }}
            >
              For you
              {feedTab === 'for_you' && (
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '56px', height: '4px', backgroundColor: '#1d9bf0', borderRadius: '9999px' }} />
              )}
            </button>
            <button
              onClick={() => setFeedTab('following')}
              style={{
                flex: 1,
                padding: '14px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: feedTab === 'following' ? '700' : '500',
                color: feedTab === 'following' ? '#0f1419' : '#536471',
                position: 'relative',
                fontSize: '15px',
              }}
            >
              Following
              {feedTab === 'following' && (
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '68px', height: '4px', backgroundColor: '#1d9bf0', borderRadius: '9999px' }} />
              )}
            </button>
          </div>

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
        </>
      )}

      {/* Main Feed Stream */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Loading tweets...</p>
      ) : tweets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f1419', marginBottom: '6px' }}>
            {feedTab === 'following' ? "You aren't following anyone yet" : 'No tweets yet'}
          </p>
          <p style={{ color: '#536471', fontSize: '14px' }}>
            {feedTab === 'following' ? 'Follow accounts to see their latest tweets here.' : 'Be the first to post something!'}
          </p>
        </div>
      ) : (
        <div>
          {tweets.map((tweet, index) => {
            const isLiked = tweet.liked_by_current_user || false;
            const isAuthor = currentUser && tweet.username === currentUser.username;
            const isLastItem = index === tweets.length - 1;
            const commentState = commentsMap[tweet.id] || { open: false, loading: false, replies: [], replyText: '' };

            return (
              <div
                key={tweet.id}
                ref={isLastItem && currentView === 'home' ? lastTweetSentinelRef : null}
                style={{ borderBottom: '1px solid #e5e7eb' }}
              >
                {/* Main Tweet Body */}
                <article style={{ padding: '16px', display: 'flex', gap: '12px', backgroundColor: '#ffffff' }}>
                  <div
                    onClick={() => navigateToProfile(tweet.username)}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, cursor: 'pointer' }}
                  >
                    {tweet.username ? tweet.username[0].toUpperCase() : 'U'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => navigateToProfile(tweet.username)}
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

                    <p style={{ margin: '6px 0 12px 0', fontSize: '15px', lineHeight: '1.4', wordBreak: 'break-word', color: '#0f1419' }}>
                      {tweet.content}
                    </p>

                    <div style={{ display: 'flex', gap: '32px', color: '#6b7280' }}>
                      {/* Comment Toggle Button (FB / Insta style) */}
                      <button
                        onClick={() => toggleComments(tweet.id)}
                        title="View / Post Comments"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          background: 'transparent',
                          border: 'none',
                          color: commentState.open ? '#1d9bf0' : '#6b7280',
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: commentState.open ? '600' : 'normal',
                        }}
                      >
                        <MessageCircle size={16} />
                        {tweet.replies_count || 0}
                      </button>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                        <Repeat2 size={16} /> 0
                      </span>

                      <button
                        onClick={() => handleLikeTweet(tweet.id)}
                        title={isLiked ? 'Unlike' : 'Like'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
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

                {/* FB/Insta Style Inline Expandable Comments Section */}
                {commentState.open && (
                  <div style={{ backgroundColor: '#f9fafb', padding: '12px 16px 16px 56px', borderTop: '1px solid #f3f4f6' }}>
                    {/* Add Comment Input Bar */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                      <input
                        type="text"
                        placeholder={`Reply to @${tweet.username}...`}
                        value={commentState.replyText || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCommentsMap((prev) => ({
                            ...prev,
                            [tweet.id]: { ...prev[tweet.id], replyText: val },
                          }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePostComment(tweet.id);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 14px',
                          borderRadius: '9999px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#ffffff',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handlePostComment(tweet.id)}
                        disabled={!commentState.replyText?.trim()}
                        style={{
                          backgroundColor: '#1d9bf0',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: commentState.replyText?.trim() ? 'pointer' : 'not-allowed',
                          opacity: commentState.replyText?.trim() ? 1 : 0.5,
                        }}
                      >
                        <Send size={15} />
                      </button>
                    </div>

                    {/* Comments List */}
                    {commentState.loading ? (
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '8px 0' }}>Loading comments...</p>
                    ) : commentState.replies?.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#9ca3af', margin: '8px 0' }}>No comments yet. Be the first to comment!</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {commentState.replies.map((reply) => {
                          const isReplyLiked = reply.liked_by_current_user || false;
                          const isReplyAuthor = currentUser && reply.username === currentUser.username;

                          return (
                            <div key={reply.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <div
                                onClick={() => navigateToProfile(reply.username)}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', flexShrink: 0, cursor: 'pointer' }}
                              >
                                {reply.username ? reply.username[0].toUpperCase() : 'U'}
                              </div>

                              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '8px 12px', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span
                                    onClick={() => navigateToProfile(reply.username)}
                                    style={{ fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                                  >
                                    @{reply.username}
                                  </span>

                                  {isReplyAuthor && (
                                    <button
                                      onClick={() => handleDeleteTweet(reply.id, tweet.id)}
                                      title="Delete Comment"
                                      style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>

                                <p style={{ margin: '4px 0 6px 0', fontSize: '13px', color: '#1f2937', wordBreak: 'break-word' }}>
                                  {reply.content}
                                </p>

                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                  <button
                                    onClick={() => handleLikeTweet(reply.id)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'none',
                                      border: 'none',
                                      color: isReplyLiked ? '#ef4444' : '#6b7280',
                                      cursor: 'pointer',
                                      padding: 0,
                                      fontSize: '11px',
                                    }}
                                  >
                                    <Heart size={12} fill={isReplyLiked ? '#ef4444' : 'none'} stroke={isReplyLiked ? '#ef4444' : 'currentColor'} />
                                    {reply.likes_count || 0}
                                  </button>
                                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                    {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
              <Loader2 className="animate-spin" size={24} color="#1d9bf0" />
            </div>
          )}

          {!nextCursor && tweets.length > 0 && currentView === 'home' && (
            <p style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontSize: '13px' }}>
              You've reached the end of the feed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}