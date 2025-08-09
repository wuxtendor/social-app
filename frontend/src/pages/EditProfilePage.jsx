import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import '/src/styles/Form.css';

function EditProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Effect to fetch the user's current data to pre-fill the form
  useEffect(() => {
    // Make sure we have the logged-in user's info before fetching
    if (user) {
      fetch(`http://localhost:5000/api/users/${user.userId}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setFormData({ 
              name: data.name || '',
              description: data.description || '', 
            });
          }
        });
    }
  }, [id, user]);
  
  // Security check to prevent a user from editing someone else's profile
  if (user && user.userId !== parseInt(id, 10)) {
    navigate(`/users/${id}`);
    return null; // Return null to prevent rendering the form for the wrong user
  }

  // Handler for the file input
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  // Handler for text inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return; // Make sure user is loaded
    
    setIsUploading(true);

    let avatarUrlToUpdate = null;

    // Step 1: If a new file was selected, upload it to Supabase Storage
    if (avatarFile) {
      const fileName = `${user.userId}_${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile);

      if (error) {
        console.error('Error uploading avatar:', error);
        alert('Failed to upload new avatar.');
        setIsUploading(false);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);
      avatarUrlToUpdate = publicUrl;
    }

    // Step 2: Prepare the data for our own backend (name, description, and maybe the new avatar URL)
    const updatePayload = {
      name: formData.name,
      description: formData.description,
      ...(avatarUrlToUpdate && { avatar: avatarUrlToUpdate }),
    };

    // Step 3: Send the updated data to our backend to save in the PostgreSQL database
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        alert('Profile updated successfully!');
        navigate(`/users/${id}`);
      } else {
        alert('Failed to update profile.');
      }
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Edit Profile</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input 
          type="text" 
          id="name"
          name="name" 
          placeholder="Your name" 
          value={formData.name} 
          onChange={handleChange} 
        />
        
        <label htmlFor="description">Description</label>
        <textarea 
          id="description"
          name="description" 
          placeholder="Your description" 
          value={formData.description} 
          onChange={handleChange}
        ></textarea>

        <label htmlFor="avatar">Change Avatar</label>
        <input 
          type="file" 
          id="avatar"
          name="avatar" 
          onChange={handleFileChange}
          accept="image/png, image/jpeg"
        />
        
        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export default EditProfilePage;