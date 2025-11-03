// API functions
const API = {
  // Get all images (admin - includes hidden)
  async getImages() {
    const apiUrl = config.API_ENDPOINT || 'https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev';
    const endpoint = `${apiUrl}/admin/gallery/images`;
    
    console.log('📷 Fetching images from:', endpoint);
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Loaded ${data.images?.length || 0} images`);
    
    return data.images || [];
  },

  // Update image attributes
  async updateImage(imageId, updates) {
    const apiUrl = config.API_ENDPOINT || 'https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev';
    const endpoint = `${apiUrl}/admin/gallery/images/${imageId}`;
    
    console.log('✏️ Updating image:', imageId, updates);
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Update failed');
    }
    
    const data = await response.json();
    console.log('✅ Image updated successfully');
    
    return data;
  },

  // Delete image
  async deleteImage(imageId) {
    const apiUrl = config.API_ENDPOINT || 'https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev';
    const endpoint = `${apiUrl}/admin/gallery/images/${imageId}`;
    
    console.log('🗑️ Deleting image:', imageId);
    
    const response = await fetch(endpoint, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Delete failed');
    }
    
    const data = await response.json();
    console.log('✅ Image deleted successfully');
    
    return data;
  },

  // Upload image
  async uploadImage(file, metadata) {
    const apiUrl = config.API_ENDPOINT || 'https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev';
    const endpoint = `${apiUrl}/admin/gallery/images`;
    
    console.log('📤 Uploading image:', metadata);
    
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file: base64,
        filename: file.name,
        contentType: file.type,
        ...metadata
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }
    
    const data = await response.json();
    console.log('✅ Image uploaded successfully');
    
    return data;
  }
};

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}