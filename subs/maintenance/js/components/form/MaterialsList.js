// Materials list component

export class MaterialsList {
  render(materials) {
    return `
      <div class="form-section">
        <h3>Materials Used</h3>
        <div id="materials-list">
          ${this.renderItems(materials)}
        </div>
        <button type="button" class="btn-secondary" id="add-material-btn">+ Add Material</button>
      </div>
    `;
  }
  
  renderItems(materials) {
    if (materials.length === 0) {
      return '<p class="empty-message">No materials added yet</p>';
    }
    
    return materials.map((material, index) => `
      <div class="material-item" data-index="${index}">
        <input 
          type="text" 
          placeholder="Item name" 
          value="${material.item || ''}"
          data-field="item"
          class="form-input"
        >
        <input 
          type="text" 
          placeholder="Quantity" 
          value="${material.quantity || ''}"
          data-field="quantity"
          class="form-input"
        >
        <input 
          type="text" 
          placeholder="Unit" 
          value="${material.unit || ''}"
          data-field="unit"
          class="form-input"
        >
        <button type="button" class="btn-remove" data-index="${index}">Remove</button>
      </div>
    `).join('');
  }
  
  attachEventListeners(container, materials) {
    const addBtn = container.querySelector('#add-material-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        materials.push({ item: '', quantity: '', unit: '' });
        this.updateList(container, materials);
      });
    }
    
    this.attachItemListeners(container, materials);
  }
  
  attachItemListeners(container, materials) {
    const removeButtons = container.querySelectorAll('.material-item .btn-remove');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        materials.splice(index, 1);
        this.updateList(container, materials);
      });
    });
    
    const materialInputs = container.querySelectorAll('.material-item input');
    materialInputs.forEach(input => {
      input.addEventListener('change', () => {
        const item = input.closest('.material-item');
        const index = parseInt(item.getAttribute('data-index'));
        const field = input.getAttribute('data-field');
        materials[index][field] = input.value;
      });
    });
  }
  
  updateList(container, materials) {
    const listDiv = container.querySelector('#materials-list');
    if (listDiv) {
      listDiv.innerHTML = this.renderItems(materials);
      this.attachItemListeners(container, materials);
    }
  }
}