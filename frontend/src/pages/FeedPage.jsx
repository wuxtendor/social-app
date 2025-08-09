import React, { useState, useEffect } from 'react';
import PostList from '../components/PostList';

function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/feed`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // The handleLikeToggle logic is identical to UserProfilePage.
  // In a real app, this might be moved to a custom hook to avoid repetition.
  const handleLikeToggle = async (postId) => {
    const token = localStorage.getItem('token');
    setPosts(currentPosts =>
      currentPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isLikedByUser: !p.isLikedByUser,
            likesCount: p.isLikedByUser ? p.likesCount - 1 : p.likesCount + 1,
          };
        }
        return p;
      })
    );
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Failed to toggle like:", error);
      fetchFeed(); // Re-fetch to ensure data consistency on error
    }
  };

  if (loading) {
    return <p>Loading feed...</p>;
  }

  return (
    <div className="feed-container">
      <h2>Your Feed</h2>
      {posts.length > 0 ? (
        <PostList posts={posts} onLikeToggle={handleLikeToggle} />
      ) : (
        <p>Your feed is empty. Find some friends to see their posts!</p>
      )}
    </div>
  );
}

export default FeedPage;