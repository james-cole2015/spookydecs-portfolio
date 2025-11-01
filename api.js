// API functions
const API = {
  // Get all images (admin - includes hidden)
  async getImages() {
    const apiUrl = config.API_ENDPOINT;
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
    const apiUrl = config.API_ENDPOINT;
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
    const apiUrl = config.API_ENDPOINT;
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

  // Upload image (placeholder for future implementation)
  async uploadImage(formData) {
    // TODO: Implement S3 upload via presigned URL or API Gateway
    throw new Error('Upload functionality not yet implemented');
  }
};