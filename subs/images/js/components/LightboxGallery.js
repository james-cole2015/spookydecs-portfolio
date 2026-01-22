// Lightbox Gallery Component
export function LightboxGallery(photos, startIndex = 0) {
  let currentIndex = startIndex;
  let isPlaying = false;
  let slideshowInterval = null;
  const SLIDESHOW_DELAY = 4000; // 4 seconds
  
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  
  overlay.innerHTML = `
    <div class="lightbox-container">
      <button class="lightbox-close" aria-label="Close">&times;</button>
      
      <button class="lightbox-nav lightbox-prev" aria-label="Previous">
        <span>‹</span>
      </button>
      
      <div class="lightbox-content">
        <img class="lightbox-image" src="" alt="Photo" />
        <div class="lightbox-photo-id"></div>
      </div>
      
      <button class="lightbox-nav lightbox-next" aria-label="Next">
        <span>›</span>
      </button>
      
      <div class="lightbox-controls">
        <button class="lightbox-play-pause" aria-label="Play slideshow">
          <span class="play-icon">▶</span>
          <span class="pause-icon" style="display: none;">⏸</span>
        </button>
        <div class="lightbox-counter"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  // Get elements
  const image = overlay.querySelector('.lightbox-image');
  const photoId = overlay.querySelector('.lightbox-photo-id');
  const counter = overlay.querySelector('.lightbox-counter');
  const closeBtn = overlay.querySelector('.lightbox-close');
  const prevBtn = overlay.querySelector('.lightbox-prev');
  const nextBtn = overlay.querySelector('.lightbox-next');
  const playPauseBtn = overlay.querySelector('.lightbox-play-pause');
  const playIcon = overlay.querySelector('.play-icon');
  const pauseIcon = overlay.querySelector('.pause-icon');
  const content = overlay.querySelector('.lightbox-content');
  
  // Show current photo
  function showPhoto(index) {
    currentIndex = index;
    const photo = photos[currentIndex];
    
    image.src = photo.cloudfront_url;
    photoId.textContent = photo.photo_id;
    counter.textContent = `${currentIndex + 1} / ${photos.length}`;
    
    // Update navigation button states
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === photos.length - 1;
  }
  
  // Navigate
  function goToNext() {
    if (currentIndex < photos.length - 1) {
      showPhoto(currentIndex + 1);
    } else if (isPlaying) {
      stopSlideshow(); // Stop at end
    }
  }
  
  function goToPrev() {
    if (currentIndex > 0) {
      showPhoto(currentIndex - 1);
    }
  }
  
  // Slideshow
  function startSlideshow() {
    if (isPlaying) return;
    
    isPlaying = true;
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'inline';
    
    slideshowInterval = setInterval(() => {
      if (currentIndex < photos.length - 1) {
        goToNext();
      } else {
        stopSlideshow();
      }
    }, SLIDESHOW_DELAY);
  }
  
  function stopSlideshow() {
    isPlaying = false;
    playIcon.style.display = 'inline';
    pauseIcon.style.display = 'none';
    
    if (slideshowInterval) {
      clearInterval(slideshowInterval);
      slideshowInterval = null;
    }
  }
  
  function toggleSlideshow() {
    if (isPlaying) {
      stopSlideshow();
    } else {
      startSlideshow();
    }
  }
  
  // Close lightbox
  function close() {
    stopSlideshow();
    document.body.style.overflow = '';
    overlay.remove();
  }
  
  // Event listeners
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => {
    stopSlideshow();
    goToPrev();
  });
  nextBtn.addEventListener('click', () => {
    stopSlideshow();
    goToNext();
  });
  playPauseBtn.addEventListener('click', toggleSlideshow);
  
  // Click left/right sides to navigate
  content.addEventListener('click', (e) => {
    const rect = content.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const third = rect.width / 3;
    
    if (clickX < third) {
      stopSlideshow();
      goToPrev();
    } else if (clickX > third * 2) {
      stopSlideshow();
      goToNext();
    }
  });
  
  // Keyboard navigation
  function handleKeyboard(e) {
    switch(e.key) {
      case 'Escape':
        close();
        break;
      case 'ArrowLeft':
        stopSlideshow();
        goToPrev();
        break;
      case 'ArrowRight':
        stopSlideshow();
        goToNext();
        break;
      case ' ':
        e.preventDefault();
        toggleSlideshow();
        break;
    }
  }
  
  document.addEventListener('keydown', handleKeyboard);
  
  // Click overlay to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
    }
  });
  
  // Cleanup on close
  overlay.addEventListener('remove', () => {
    document.removeEventListener('keydown', handleKeyboard);
    stopSlideshow();
  });
  
  // Touch gestures for mobile
  let touchStartX = 0;
  let touchEndX = 0;
  
  content.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  content.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
      stopSlideshow();
      if (diff > 0) {
        goToNext(); // Swipe left
      } else {
        goToPrev(); // Swipe right
      }
    }
  }
  
  // Initialize
  showPhoto(currentIndex);
  
  return {
    close,
    goToNext,
    goToPrev,
    toggleSlideshow
  };
}