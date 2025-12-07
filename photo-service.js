// photo-service.js - Photo API integration and S3 upload orchestration

const PHOTO_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],
  thumbnailWidth: 300,
  thumbnailQuality: 0.8
};

/**
 * Validate file before upload
 */
function validateFile(file) {
  if (!file) {
    throw new Error('No file selected');
  }
  
  if (file.size > PHOTO_CONFIG.maxFileSize) {
    throw new Error('File too large (max 10MB)');
  }
  
  if (!PHOTO_CONFIG.acceptedFormats.includes(file.type)) {
    throw new Error('Invalid file type (jpg, png, heic only)');
  }
  
  return true;
}

/**
 * Create thumbnail from image file
 */
async function createThumbnail(file, maxWidth = PHOTO_CONFIG.thumbnailWidth) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const scaleFactor = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleFactor;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail'));
            }
          },
          'image/jpeg',
          PHOTO_CONFIG.thumbnailQuality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get all photos for an item
 */
async function getPhotosForItem(itemId) {
  try {
    const url = `${config.API_ENDPOINT}/images?item_id=${itemId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.photos || [];
  } catch (error) {
    console.error('Error fetching photos:', error);
    throw error;
  }
}

/**
 * Request presigned URLs for upload
 */
async function requestPresignedUrls(metadata) {
  try {
    const url = `${config.API_ENDPOINT}/admin/images/presign`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get presigned URLs: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error requesting presigned URLs:', error);
    throw error;
  }
}

/**
 * Upload file to S3 using presigned URL
 */
async function uploadToS3(presignedUrl, file, contentType) {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });
    
    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

/**
 * Confirm upload to DynamoDB
 */
async function confirmUpload(photoData) {
  try {
    const url = `${config.API_ENDPOINT}/admin/images/confirm`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to confirm upload: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error confirming upload:', error);
    throw error;
  }
}

/**
 * Update photo metadata
 */
async function updatePhoto(photoId, updates) {
  try {
    const url = `${config.API_ENDPOINT}/admin/images/${photoId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update photo: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating photo:', error);
    throw error;
  }
}

/**
 * Delete photo
 */
async function deletePhoto(photoId) {
  try {
    const url = `${config.API_ENDPOINT}/admin/images/${photoId}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete photo: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
}

/**
 * Main upload orchestrator - handles full image + thumbnail upload
 */
async function uploadPhotoWithThumbnail(file, itemId, season) {
  try {
    // Validate file
    validateFile(file);
    
    // Get existing photos to determine if this should be primary
    const existingPhotos = await getPhotosForItem(itemId);
    const isFirstPhoto = existingPhotos.length === 0;
    
    // Generate thumbnail
    let thumbnailBlob;
    let thumbnailFailed = false;
    
    try {
      thumbnailBlob = await createThumbnail(file);
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      thumbnailFailed = true;
    }
    
    // Prepare metadata for presigned URL request
    const filename = file.name;
    const thumbFilename = `thumb-${filename}`;
    
    const presignRequest = {
      context: 'item',
      item_ids: [itemId],
      photo_type: 'catalog',
      season: season.toLowerCase(),
      is_public: false,
      files: [
        {
          filename: filename,
          content_type: file.type,
        },
      ],
    };
    
    // Add thumbnail if generated successfully
    if (!thumbnailFailed) {
      presignRequest.files.push({
        filename: thumbFilename,
        content_type: 'image/jpeg',
      });
    }
    
    // Request presigned URLs
    const presignResponse = await requestPresignedUrls(presignRequest);
    
    if (!presignResponse.uploads || presignResponse.uploads.length === 0) {
      throw new Error('No presigned URLs returned');
    }
    
    const fullImageUpload = presignResponse.uploads[0];
    
    // Upload full image to S3
   await uploadToS3(fullImageUpload.presigned_url, file, file.type);
    
    // Upload thumbnail to S3 (if generated)
    let thumbCloudFrontUrl = fullImageUpload.thumb_cloudfront_url; 
    let thumbS3Key = fullImageUpload.thumb_s3_key; 
    
if (!thumbnailFailed && fullImageUpload.thumb_presigned_url) {
  try {
    await uploadToS3(fullImageUpload.thumb_presigned_url, thumbnailBlob, 'image/jpeg');
  } catch (error) {
    console.error('Thumbnail upload to S3 failed:', error);
    thumbnailFailed = true;
  }
}
    
    // Prepare confirmation data
    const confirmData = {
      context: 'item',
      item_ids: [itemId],
      photo_type: 'catalog',
      season: season.toLowerCase(),
      year: new Date().getFullYear(),
      is_public: false,
      is_primary: isFirstPhoto,
      caption: '',
      photos: [
        {
          cloudfront_url: fullImageUpload.cloudfront_url,
          thumb_cloudfront_url: thumbCloudFrontUrl,
          s3_key: fullImageUpload.s3_key,
          thumb_s3_key: thumbS3Key,
          metadata: {
            filename: filename,
            size: file.size,
            type: file.type,
          },
        },
      ],
    };
    
    // Confirm upload to DynamoDB
    const confirmResponse = await confirmUpload(confirmData);
    
    return {
      success: true,
      thumbnailFailed: thumbnailFailed,
      photo: confirmResponse,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
