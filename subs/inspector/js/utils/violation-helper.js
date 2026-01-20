/**
 * violation-helper.js
 * Extracts detailed violation reasons from violation_details
 */

function getViolationReason(violation) {
  const { rule_id, violation_details } = violation;
  
  // Handle missing violation_details
  if (!violation_details) {
    return {
      type: 'unknown',
      display: 'No violation details available'
    };
  }

  // Check if this is a "missing fields" type violation
  if (violation_details.missing_fields && Array.isArray(violation_details.missing_fields)) {
    return handleMissingFields(violation_details);
  }

  // Handle specific rule types that need custom rendering
  if (rule_id === 'MISSING_PRIMARY_PHOTO') {
    return handleMissingPrimaryPhoto(violation_details);
  }
  
  if (rule_id === 'DUPLICATE_LIGHTS' || rule_id === 'DUPLICATE_ITEMS') {
    return handleDuplicateLights(violation_details);
  }

  // Default handler for unknown rule types
  return {
    type: 'generic',
    display: violation_details.message || 'Violation detected'
  };
}

/**
 * Generic handler for any violation with missing_fields array
 * Works for: MISSING_PACKING_DATA, MISSING_DEPLOYMENT_DATA, MISSING_VENDOR_METADATA, etc.
 */
function handleMissingFields(details) {
  const missingFields = details.missing_fields || [];
  
  if (missingFields.length === 0) {
    return {
      type: 'list',
      display: 'All required fields are present (unexpected violation state)'
    };
  }

  // Extract field names and format them nicely
  const fieldNames = missingFields.map(field => {
    // Split on dots to get nested field path
    const parts = field.split('.');
    
    // If it's a nested field (e.g., "vendor_metadata.cost"), format it nicely
    if (parts.length > 1) {
      // Return as "cost (in vendor_metadata)" or just "cost" if preferred
      return {
        fullPath: field,
        fieldName: parts[parts.length - 1], // Last part
        parent: parts.slice(0, -1).join('.') // Everything except last part
      };
    }
    
    // Simple field (no nesting)
    return {
      fullPath: field,
      fieldName: field,
      parent: null
    };
  });

  return {
    type: 'list',
    title: 'Missing Required Fields',
    items: fieldNames,
    count: fieldNames.length,
    display: `Missing ${fieldNames.length} required field${fieldNames.length > 1 ? 's' : ''}`
  };
}

/**
 * Handle missing primary photo violations
 */
function handleMissingPrimaryPhoto(details) {
  const checkField = details.rule_config?.check_field || 'images.primary_photo_id';
  
  return {
    type: 'field',
    field: checkField,
    display: `No value for ${checkField}`
  };
}

/**
 * Handle duplicate lights violations
 */
function handleDuplicateLights(details) {
  const matchingField = details.matching_field || 'unknown field';
  const similarityScore = details.similarity_score || 0;
  
  const item1Name = details.item1_short_name || 'Unknown Item';
  const item1Id = details.item1_id || '';
  
  const item2Name = details.item2_short_name || 'Unknown Item';
  const item2Id = details.item2_id || '';

  return {
    type: 'duplicate',
    matchingField,
    similarityScore,
    item1: {
      id: item1Id,
      name: item1Name
    },
    item2: {
      id: item2Id,
      name: item2Name
    },
    display: `${Math.round(similarityScore * 100)}% match between '${item1Name}' and '${item2Name}'`
  };
}

/**
 * Render HTML for violation reason section
 */
function renderViolationReason(violation) {
  const reason = getViolationReason(violation);

  switch (reason.type) {
    case 'list':
      return renderListReason(reason);
    
    case 'field':
      return renderFieldReason(reason);
    
    case 'duplicate':
      return renderDuplicateReason(reason);
    
    case 'generic':
    case 'unknown':
    default:
      return renderGenericReason(reason);
  }
}

/**
 * Render list-type reasons (missing fields)
 */
function renderListReason(reason) {
  const listItems = reason.items.map(item => {
    // item is an object with { fullPath, fieldName, parent }
    if (item.parent) {
      return `
        <li>
          <code class="field-name">${sanitizeHtml(item.fieldName)}</code>
          <span class="field-path">in ${sanitizeHtml(item.parent)}</span>
        </li>
      `;
    } else {
      return `<li><code class="field-name">${sanitizeHtml(item.fieldName)}</code></li>`;
    }
  }).join('');

  return `
    <div class="violation-reason-section">
      <h3>${sanitizeHtml(reason.title || 'Violation Details')}</h3>
      <p class="missing-fields-summary">
        <strong>${reason.count}</strong> required field${reason.count > 1 ? 's are' : ' is'} missing:
      </p>
      <ul class="violation-reason-list">
        ${listItems}
      </ul>
    </div>
  `;
}

/**
 * Render field-type reasons (single missing field)
 */
function renderFieldReason(reason) {
  return `
    <div class="violation-reason-section">
      <h3>Missing Field</h3>
      <p class="violation-reason-field">
        No value found for <code>${sanitizeHtml(reason.field)}</code>
      </p>
    </div>
  `;
}

/**
 * Render duplicate-type reasons
 */
function renderDuplicateReason(reason) {
  return `
    <div class="violation-reason-section">
      <h3>Duplicate Detection</h3>
      <div class="violation-reason-duplicate">
        <p>
          <strong>Item 1:</strong> ${sanitizeHtml(reason.item1.name)}
          ${reason.item1.id ? `<span class="item-id">(${sanitizeHtml(reason.item1.id)})</span>` : ''}
        </p>
        <p>
          <strong>Item 2:</strong> ${sanitizeHtml(reason.item2.name)}
          ${reason.item2.id ? `<span class="item-id">(${sanitizeHtml(reason.item2.id)})</span>` : ''}
        </p>
        <p>
          <strong>Matching Field:</strong> <code>${sanitizeHtml(reason.matchingField)}</code>
        </p>
        <p>
          <strong>Similarity Score:</strong> ${Math.round(reason.similarityScore * 100)}%
        </p>
      </div>
    </div>
  `;
}

/**
 * Render generic reasons (fallback)
 */
function renderGenericReason(reason) {
  return `
    <div class="violation-reason-section">
      <h3>Violation Details</h3>
      <p>${sanitizeHtml(reason.display)}</p>
    </div>
  `;
}