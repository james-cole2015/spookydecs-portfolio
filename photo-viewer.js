// photo-viewer.js - Full-screen photo viewer modal

let viewerPhotos = [];
let viewerCurrentIndex = 0;

/**
 * Open photo viewer with photo array and initial index
 */
function openPhotoViewer(photos, initialIndex = 0) {
  if (!photos || photos.length === 0) return;
  
  viewerPhotos = photos;
  viewerCurrentIndex = initialIndex;
  
  const modal = document.getElementById('photoViewerModal');
  if (!modal) {
    console.error('Photo viewer modal not found');
    return;
  }
  
  // Show modal
  modal.style.display = 'flex';
  
  // Disable body scroll
  document.body.style.overflow = 'hidden';
  
  // Show initial photo
  showPhoto(initialIndex);
  
  // Add keyboard event listener
  document.addEventListener('keydown', handleViewerKeyboard);
}

/**
 * Close photo viewer
 */
function closePhotoViewer() {
  const modal = document.getElementById('photoViewerModal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Re-enable body scroll
  document.body.style.overflow = '';
  
  // Remove keyboard event listener
  document.removeEventListener('keydown', handleViewerKeyboard);
  
  // Clear state
  viewerPhotos = [];
  viewerCurrentIndex = 0;
}

/**
 * Show photo at specific index
 */
function showPhoto(index) {
  if (index < 0 || index >= viewerPhotos.length) return;
  
  viewerCurrentIndex = index;
  const photo = viewerPhotos[index];
  
  // Update image
  const img = document.getElementById('photoViewerImage');
  if (img) {
    img.src = photo.cloudfront_url;
    img.alt = photo.caption || `Photo ${index + 1}`;
  }
  
  // Update caption
  const caption = document.getElementById('photoViewerCaption');
  if (caption) {
    const item = window.currentViewItem;
    const itemName = item ? item.short_name : 'Item';
    caption.textContent = photo.caption || itemName;
  }
  
  // Update counter
  const counter = document.getElementById('photoViewerCounter');
  if (counter) {
    counter.textContent = `${index + 1} of ${viewerPhotos.length}`;
  }
  
  // Show/hide navigation buttons
  const prevBtn = document.querySelector('.photo-viewer-prev');
  const nextBtn = document.querySelector('.photo-viewer-next');
  
  if (prevBtn) {
    prevBtn.style.display = viewerPhotos.length > 1 ? 'block' : 'none';
    prevBtn.disabled = index === 0;
  }
  
  if (nextBtn) {
    nextBtn.style.display = viewerPhotos.length > 1 ? 'block' : 'none';
    nextBtn.disabled = index === viewerPhotos.length - 1;
  }
}

/**
 * Navigate to next photo
 */
function nextPhoto() {
  if (viewerCurrentIndex < viewerPhotos.length - 1) {
    showPhoto(viewerCurrentIndex + 1);
  }
}

/**
 * Navigate to previous photo
 */
function prevPhoto() {
  if (viewerCurrentIndex > 0) {
    showPhoto(viewerCurrentIndex - 1);
  }
}

/**
 * Handle keyboard navigation
 */
function handleViewerKeyboard(e) {
  switch (e.key) {
    case 'Escape':
      closePhotoViewer();
      break;
    case 'ArrowRight':
      nextPhoto();
      break;
    case 'ArrowLeft':
      prevPhoto();
      break;
  }
}

/**
 * Handle click on backdrop to close
 */
document.addEventListener('click', (e) => {
  const modal = document.getElementById('photoViewerModal');
  if (e.target === modal) {
    closePhotoViewer();
  }
});
