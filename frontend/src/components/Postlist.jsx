import React from 'react';
import Post from './Post';

function PostList({ posts, onLikeToggle }) {
  return (
    <div className="post-list">
      {posts.map(post => (
        <Post key={post.id} post={post} onLikeToggle={onLikeToggle} />
      ))}
    </div>
  );
}

export default PostList;