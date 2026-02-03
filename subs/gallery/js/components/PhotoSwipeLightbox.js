/**
 * PhotoSwipeLightbox Component
 * 
 * Lightbox gallery using PhotoSwipe
 * Shows full photo with metadata (caption, tags, etc.)
 */

export class PhotoSwipeLightbox {
  constructor() {
    this.lightbox = null;
  }

  /**
   * Open lightbox with photos
   * 
   * @param {Array} photos - Array of photo objects
   * @param {number} index - Starting index
   */
  async open(photos, index = 0) {
    // Dynamically import PhotoSwipe
    const PhotoSwipeModule = await import('https://cdn.jsdelivr.net/npm/photoswipe@5.3.8/dist/photoswipe.esm.min.js');
    const PhotoSwipe = PhotoSwipeModule.default;

    // Prepare data source with actual image dimensions
    const dataSource = await Promise.all(photos.map(async (photo) => {
      const dimensions = await this.getImageDimensions(photo.cloudfront_url);
      return {
        src: photo.cloudfront_url,
        width: dimensions.width,
        height: dimensions.height,
        alt: photo.display_name || 'Display photo',
        caption: this.buildCaption(photo)
      };
    }));

    // Create and open lightbox
    const lightbox = new PhotoSwipe({
      dataSource,
      index,
      pswpModule: PhotoSwipeModule,
      
      // Options
      bgOpacity: 0.95,
      spacing: 0.1,
      allowPanToNext: true,
      loop: true,
      
      // UI options
      closeOnVerticalDrag: true,
      pinchToClose: true,
      
      // Caption
      showHideAnimationType: 'fade',
      
      // Padding
      paddingFn: (viewportSize) => {
        return {
          top: 30,
          bottom: 30,
          left: 10,
          right: 10
        };
      }
    });

    lightbox.init();
    this.lightbox = lightbox;
  }

  /**
   * Get actual image dimensions
   */
  getImageDimensions(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        // Fallback to 16:9 aspect ratio if image fails to load
        resolve({ width: 1920, height: 1080 });
      };
      img.src = src;
    });
  }

  /**
   * Build caption HTML with full metadata
   */
  buildCaption(photo) {
    const parts = [];

    // Display name
    if (photo.display_name) {
      parts.push(`<div style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">${photo.display_name}</div>`);
    }

    // Location
    if (photo.location) {
      parts.push(`<div style="font-size: 0.95rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 0.5rem;">📍 ${photo.location}</div>`);
    }

    // Caption
    if (photo.caption) {
      parts.push(`<div style="font-size: 0.95rem; margin-top: 0.75rem; line-height: 1.5;">${photo.caption}</div>`);
    }

    // Tags
    if (photo.tags && photo.tags.length > 0) {
      const tagBadges = photo.tags.map(tag => 
        `<span style="
          display: inline-block;
          padding: 0.25rem 0.75rem;
          margin: 0.25rem 0.25rem 0 0;
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
        ">#${tag}</span>`
      ).join('');
      
      parts.push(`<div style="margin-top: 0.75rem;">${tagBadges}</div>`);
    }

    // Season & Year
    const metadata = [];
    if (photo.season) {
      const seasonEmoji = this.getSeasonEmoji(photo.season);
      metadata.push(`${seasonEmoji} ${this.capitalize(photo.season)}`);
    }
    if (photo.year) {
      metadata.push(`📅 ${photo.year}`);
    }
    
    if (metadata.length > 0) {
      parts.push(`<div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.6); margin-top: 0.75rem;">${metadata.join(' • ')}</div>`);
    }

    return `
      <div style="
        padding: 1.5rem;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 70%, transparent 100%);
        color: white;
      ">
        ${parts.join('')}
      </div>
    `;
  }

  /**
   * Get emoji for season
   */
  getSeasonEmoji(season) {
    const emojis = {
      'halloween': '🎃',
      'christmas': '🎄',
      'shared': '🌟'
    };
    return emojis[season.toLowerCase()] || '🌟';
  }

  /**
   * Capitalize string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Close lightbox
   */
  close() {
    if (this.lightbox) {
      this.lightbox.close();
    }
  }

  /**
   * Destroy lightbox
   */
  destroy() {
    if (this.lightbox) {
      this.lightbox.destroy();
      this.lightbox = null;
    }
  }
}