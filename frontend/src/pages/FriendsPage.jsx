import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '/src/styles/Form.css'; // Reuse form styles

function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    // Fetch all three lists in parallel
    const [friendsRes, incomingRes, sentRes] = await Promise.all([
      fetch('http://localhost:5000/api/friends', { headers }),
      fetch('http://localhost:5000/api/friend-requests', { headers }),
      fetch('http://localhost:5000/api/friend-requests/sent', { headers })
    ]);

    setFriends(await friendsRes.json());
    setIncomingRequests(await incomingRes.json());
    setSentRequests(await sentRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequest = async (requestId, newStatus) => {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5000/api/friend-requests/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData(); // Refresh all lists after an action
  };

  return (
    <div className="friends-page-container">
      {/* Section for Current Friends */}
      <div className="friends-section">
        <h2>My Friends</h2>
        {friends.length > 0 ? (
          <ul className="requests-list">
            {friends.map(friend => (
              <li key={friend.id} className="request-item">
                <Link to={`/users/${friend.id}`}>
                  <img src={friend.avatar} alt="avatar" className="request-avatar" />
                  <span>{friend.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p>You haven't added any friends yet.</p>}
      </div>

      {/* Section for Incoming Requests */}
      <div className="friends-section">
        <h2>Incoming Requests</h2>
        {incomingRequests.length > 0 ? (
          <ul className="requests-list">
            {incomingRequests.map(req => (
              <li key={req.id} className="request-item">
                <Link to={`/users/${req.requester.id}`}>
                  <img src={req.requester.avatar} alt="avatar" className="request-avatar" />
                  <span>{req.requester.name}</span>
                </Link>
                <div className="request-actions">
                  <button onClick={() => handleRequest(req.id, 'ACCEPTED')} className="accept-btn">Accept</button>
                  <button onClick={() => handleRequest(req.id, 'REJECTED')} className="reject-btn">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p>No incoming friend requests.</p>}
      </div>

      {/* Section for Sent Requests */}
      <div className="friends-section">
        <h2>Sent Requests</h2>
        {sentRequests.length > 0 ? (
          <ul className="requests-list">
            {sentRequests.map(req => (
              <li key={req.id} className="request-item">
                 <Link to={`/users/${req.addressee.id}`}>
                  <img src={req.addressee.avatar} alt="avatar" className="request-avatar" />
                  <span>{req.addressee.name}</span>
                </Link>
                <span>Pending</span>
              </li>
            ))}
          </ul>
        ) : <p>No pending sent requests.</p>}
      </div>
    </div>
  );
}

export default FriendsPage;