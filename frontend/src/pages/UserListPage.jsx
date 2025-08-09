import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Link is like an <a> tag but for internal routing

function UserListPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Fetch the list of all users from our new endpoint
    fetch(`${import.meta.env.VITE_API_URL}/api/users`)
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  return (
    <div>
      <h2>All Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {/* Each name links to that user's specific profile page */}
            <Link to={`/users/${user.id}`}>{user.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserListPage;