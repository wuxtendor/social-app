import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Profile from '../components/Profile';
import PostList from '../components/PostList';
import FriendshipButton from '../components/FriendshipButton';
import { useAuth } from '../context/AuthContext';

// --- Create Post Form Component ---
// This form is used for creating a new post.
function CreatePostForm({ onPostCreated }) {
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      if (response.ok) {
        setContent(''); // Clear the form after successful submission
        onPostCreated(); // Tell the parent component to refresh the post list
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        required
      ></textarea>
      <button type="submit">Post</button>
    </form>
  );
}


// --- User Profile Page Component ---
// This is the main component for the page.
function UserProfilePage() {
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friendship, setFriendship] = useState(null);
  const { id } = useParams();
  const { user: loggedInUser } = useAuth();

  const isOwnProfile = loggedInUser && loggedInUser.userId === parseInt(id, 10);

  // Unified function to fetch all data for the page (profile, posts, friendship status).
  // useCallback is used to prevent this function from being recreated on every render.
  const fetchAllData = useCallback(async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    // Fetch all necessary data in parallel for better performance
    const [userRes, postsRes, friendRes] = await Promise.all([
      fetch(`http://localhost:5000/api/users/${id}`),
      fetch(`http://localhost:5000/api/users/${id}/posts`, { headers }),
      loggedInUser && !isOwnProfile ? fetch(`http://localhost:5000/api/friendship-status/${id}`, { headers }) : Promise.resolve(null)
    ]);

    setProfileUser(await userRes.json());
    setPosts(await postsRes.json());

    if (friendRes && friendRes.ok) {
      const friendData = await friendRes.json();
      setFriendship({ ...friendData, loggedInUserId: loggedInUser.userId });
    }
  }, [id, loggedInUser, isOwnProfile]);

  // This effect runs once when the component mounts or when the user ID changes.
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // This function handles liking/unliking a post and is passed down to the PostList.
  const handleLikeToggle = async (postId) => {
    const token = localStorage.getItem('token');
    
    // Optimistic UI Update: Update the UI immediately without waiting for the server.
    setPosts(currentPosts =>
      currentPosts.map(p => {
        if (p.id === postId) {
          const isCurrentlyLiked = p.isLikedByUser;
          return {
            ...p,
            isLikedByUser: !isCurrentlyLiked,
            likesCount: isCurrentlyLiked ? p.likesCount - 1 : p.likesCount + 1,
          };
        }
        return p;
      })
    );

    // Send the actual request to the backend.
    try {
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // If the server request fails, revert the UI change by re-fetching all data.
      if (!response.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      fetchAllData(); // Revert on any other error as well.
    }
  };

  // Render a loading message until the profile user's data has been fetched.
  if (!profileUser) {
    return <p>Loading profile...</p>;
  }

  return (
    <div>
      <Profile userData={profileUser} />

      <div className="profile-actions">
        {/* Show "Edit Profile" button only on the user's own profile */}
        {isOwnProfile && (
          <Link to={`/users/${profileUser.id}/edit`}>
            <button>Edit Profile</button>
          </Link>
        )}
        {/* Show friendship and message buttons only when viewing another user's profile */}
        {!isOwnProfile && loggedInUser && (
          <>
            <FriendshipButton 
              profileUser={profileUser}
              friendshipStatus={friendship}
              onAction={fetchAllData}
            />
            <Link to={`/chat/${profileUser.id}`}>
              <button>Message</button>
            </Link>
          </>
        )}
      </div>
      
      <hr style={{ margin: '30px 0' }} />

      {/* Show the post creation form only on the user's own profile */}
      {isOwnProfile && <CreatePostForm onPostCreated={fetchAllData} />}
      
      <h3>Posts</h3>
      <PostList posts={posts} onLikeToggle={handleLikeToggle} />
    </div>
  );
}

export default UserProfilePage;