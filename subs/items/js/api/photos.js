// Photos API Client

const HEADERS = { 'Content-Type': 'application/json' };

async function getEndpoint() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

export async function fetchPhotoById(photoId) {
  try {
    const apiEndpoint = await getEndpoint();
    const response = await fetch(`${apiEndpoint}/admin/images/${photoId}`, {
      method: 'GET',
      headers: HEADERS
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch photo: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching photo ${photoId}:`, error);
    return null;
  }
}

export async function fetchPhotosByIds(photoIds) {
  if (!photoIds || photoIds.length === 0) return [];

  const results = await Promise.all(photoIds.map(id => fetchPhotoById(id)));
  return results.filter(photo => photo !== null);
}

async function generateThumbnail(file, maxWidth = 300, maxHeight = 300) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) { height = height * (maxWidth / width); width = maxWidth; }
      } else {
        if (height > maxHeight) { width = width * (maxHeight / height); height = maxHeight; }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to generate thumbnail')),
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => reject(new Error('Failed to load image for thumbnail generation'));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadPhoto(file, itemId, season, isPrimary = false) {
  if (!file || !(file instanceof File)) throw new Error('Invalid file object');

  const apiEndpoint = await getEndpoint();

  // Step 1: Presign
  const presignResponse = await fetch(`${apiEndpoint}/admin/images/presign`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      context: 'item',
      photo_type: 'catalog',
      season: season.toLowerCase(),
      files: [{ filename: file.name, content_type: file.type }],
      item_ids: [itemId],
      is_public: false
    })
  });

  if (!presignResponse.ok) {
    const errorData = await presignResponse.json().catch(() => ({}));
    throw new Error(errorData.error || `Presign failed: ${presignResponse.status}`);
  }

  const presignData = await presignResponse.json();
  if (!presignData.uploads || presignData.uploads.length === 0) {
    throw new Error('No presigned URLs returned');
  }

  const upload = presignData.uploads[0];

  // Step 2: Generate thumbnail
  const thumbnailBlob = await generateThumbnail(file);

  // Step 3: Upload full image to S3
  const imageUploadResponse = await fetch(upload.presigned_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });
  if (!imageUploadResponse.ok) {
    throw new Error(`S3 image upload failed: ${imageUploadResponse.status}`);
  }

  // Step 4: Upload thumbnail to S3
  const thumbUploadResponse = await fetch(upload.thumb_presigned_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: thumbnailBlob
  });
  if (!thumbUploadResponse.ok) {
    throw new Error(`S3 thumbnail upload failed: ${thumbUploadResponse.status}`);
  }

  // Step 5: Confirm
  const confirmResponse = await fetch(`${apiEndpoint}/admin/images/confirm`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      context: 'item',
      photo_type: 'catalog',
      season: season.toLowerCase(),
      year: new Date().getFullYear(),
      item_ids: [itemId],
      is_primary: isPrimary,
      is_public: false,
      photos: [{
        cloudfront_url: upload.cloudfront_url,
        thumb_cloudfront_url: upload.thumb_cloudfront_url,
        s3_key: upload.s3_key,
        thumb_s3_key: upload.thumb_s3_key,
        metadata: {
          original_filename: file.name,
          content_type: file.type,
          file_size: file.size
        }
      }]
    })
  });

  if (!confirmResponse.ok) {
    const errorData = await confirmResponse.json().catch(() => ({}));
    throw new Error(errorData.error || `Confirm failed: ${confirmResponse.status}`);
  }

  const confirmData = await confirmResponse.json();
  return {
    photo_id: confirmData.photo_ids[0],
    cloudfront_url: upload.cloudfront_url,
    thumb_cloudfront_url: upload.thumb_cloudfront_url
  };
}

export async function uploadPhotos(files, itemId, season) {
  if (!files || files.length === 0) return [];
  return await Promise.all(files.map((file, index) => uploadPhoto(file, itemId, season, index === 0)));
}

export async function linkPhotoToItem(photoId, itemId, isPrimary = false) {
  const apiEndpoint = await getEndpoint();
  const response = await fetch(`${apiEndpoint}/admin/images/${photoId}/link`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ item_id: itemId, is_primary: isPrimary })
  });

  if (!response.ok) throw new Error(`Failed to link photo: ${response.status}`);
  return await response.json();
}

export async function unlinkPhotoFromItem(photoId, itemId) {
  const apiEndpoint = await getEndpoint();
  const response = await fetch(`${apiEndpoint}/admin/images/${photoId}/unlink`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ item_id: itemId })
  });

  if (!response.ok) throw new Error(`Failed to unlink photo: ${response.status}`);
  return await response.json();
}

export async function deletePhoto(photoId) {
  const apiEndpoint = await getEndpoint();
  const response = await fetch(`${apiEndpoint}/admin/images/${photoId}`, {
    method: 'DELETE',
    headers: HEADERS
  });

  if (!response.ok) throw new Error(`Failed to delete photo: ${response.status}`);
  return await response.json();
}

export async function getPhotosForItem(item) {
  const result = { primary: null, secondary: [] };
  if (!item?.images) return result;

  if (item.images.primary_photo_id) {
    result.primary = await fetchPhotoById(item.images.primary_photo_id);
  }

  if (item.images.secondary_photo_ids?.length > 0) {
    result.secondary = await fetchPhotosByIds(item.images.secondary_photo_ids);
  }

  return result;
}

export function validateFile(file) {
  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];

  if (file.size > MAX_SIZE) {
    throw new Error(`File too large. Maximum size is 10MB (file is ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Allowed types: JPEG, PNG, HEIC, HEIF');
  }
}