import React from 'react';
import { Link } from 'react-router-dom';

function FriendshipButton({ profileUser, friendshipStatus, onAction }) {
  const sendFriendRequest = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL}/api/friend-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ addresseeId: profileUser.id }),
    });
    onAction(); // Tell the parent page to refresh its data
  };

  // Don't render anything until the friendship status has loaded
  if (!friendshipStatus) return null;

  // Case 1: They are not friends and no request is pending.
  if (friendshipStatus.status === 'NOT_FRIENDS') {
    return <button onClick={sendFriendRequest}>Add Friend</button>;
  }

  // Case 2: The request is pending.
  if (friendshipStatus.status === 'PENDING') {
    // Check if the currently logged-in user is the one who sent the request.
    if (friendshipStatus.requesterId === friendshipStatus.loggedInUserId) {
      return <button disabled>Request Sent</button>;
    } else {
      // Otherwise, the logged-in user is the one who received it.
      return <Link to="/friend-requests"><button>Respond to Request</button></Link>;
    }
  }

  // Case 3: They are already friends.
  if (friendshipStatus.status === 'ACCEPTED') {
    return <button disabled>Friends</button>;
  }

  return null; // Fallback
}

export default FriendshipButton;