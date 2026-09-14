import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Repeat2, Trash2 } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/v1/tweets';

export default function App() {
  // 1. Application State
  const [tweets, setTweets] = useState([]);
  const [content, setContent] = useState('');
  const [username] = useState('satya_dev');
  const [loading, setLoading] = useState(true);

  // 2. Lifecycle: Fetch tweets on initial mount
  useEffect(() => {
    loadTweets();
  }, []);

  // GET Request: Load timeline from Rails API
  const loadTweets = async () => {
    try {
      const res = await fetch(API_URL, {
        headers: {
          'Accept': 'application/json',
        },
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

  // POST Request: Create tweet matching Rails strong parameter requirements
  const handleCreateTweet = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          tweet: {
            username: username,
            content: content.trim(),
          },
        }),
      });

      if (res.ok) {
        const newTweet = await res.json();
        // Prepend newly created tweet directly to the top of the feed
        setTweets([newTweet, ...tweets]);
        setContent('');
      } else {
        const errorData = await res.json();
        console.error('Validation failed:', errorData.errors);
      }
    } catch (err) {
      console.error('Error posting tweet:', err);
    }
  };

  // DELETE Request: Remove tweet by ID
  const handleDeleteTweet = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        setTweets(tweets.filter((tweet) => tweet.id !== id));
      }
    } catch (err) {
      console.error('Error deleting tweet:', err);
    }
  };

  // POST Request: Like tweet with optimistic UI update and fallback
  const handleLikeTweet = async (id) => {
    // 1. Optimistic UI update: instantly increment count on the client
    setTweets(
      tweets.map((tweet) =>
        tweet.id === id ? { ...tweet, likes_count: (tweet.likes_count || 0) + 1 } : tweet
      )
    );

    try {
      const res = await fetch(`${API_URL}/${id}/like`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        // Rollback state if server returns an error
        loadTweets();
      }
    } catch (err) {
      console.error('Error liking tweet:', err);
      loadTweets();
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', minHeight: '100vh' }}>
      {/* Sticky Header */}
      <header style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, backgroundColor: '#ffffffcc', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Home</h1>
      </header>

      {/* Tweet Composer Form */}
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
          {tweets.map((tweet) => (
            <article key={tweet.id} style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '12px' }}>
              {/* Avatar Initial */}
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                {tweet.username ? tweet.username[0].toUpperCase() : 'U'}
              </div>

              {/* Tweet Body */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>@{tweet.username}</span>
                  <button
                    onClick={() => handleDeleteTweet(tweet.id)}
                    title="Delete Tweet"
                    style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p style={{ margin: '6px 0 12px 0', fontSize: '15px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {tweet.content}
                </p>
                {/* Metrics */}
                <div style={{ display: 'flex', gap: '32px', color: '#6b7280' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                    <MessageCircle size={16} /> 0
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                    <Repeat2 size={16} /> 0
                  </span>
                  <button
                    onClick={() => handleLikeTweet(tweet.id)}
                    title="Like Tweet"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px',
                      background: 'transparent',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                  >
                    <Heart size={16} /> {tweet.likes_count || 0}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}