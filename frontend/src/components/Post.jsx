import React from 'react';
import './Post.css';

function Post({ post, onLikeToggle }) {
  const handleLikeClick = () => {
    // Just tell the parent WHICH post was clicked.
    onLikeToggle(post.id); 
  };

  return (
    <div className="post-container">
      <div className="post-header">
        <img 
          src={post.author.avatar || 'https://i.pravatar.cc/150'} 
          alt={`${post.author.name}'s avatar`} 
          className="post-avatar" 
        />
        <span className="post-author-name">{post.author.name}</span>
      </div>
      <p className="post-content">{post.content}</p>
      <div className="post-footer">
        <button onClick={handleLikeClick} className={`like-button ${post.isLikedByUser ? 'liked' : ''}`}>
          ❤️ Like
        </button>
        <span className="likes-count">{post.likesCount} likes</span>
      </div>
      <p className="post-timestamp">{new Date(post.createdAt).toLocaleString()}</p>
    </div>
  );
}

export default Post;