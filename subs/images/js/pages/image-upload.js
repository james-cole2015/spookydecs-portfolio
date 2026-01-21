// Image Upload Page
import { ImageUpload } from '../components/ImageUpload.js';

export async function renderImageUpload() {
  const app = document.getElementById('app');
  
  app.innerHTML = '';
  app.appendChild(ImageUpload());
}
