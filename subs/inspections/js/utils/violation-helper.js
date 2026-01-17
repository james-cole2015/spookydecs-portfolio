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

  // Route to specific handler based on rule type
  if (rule_id === 'MISSING_PACKING_DATA') {
    return handleMissingPackingData(violation_details);
  }
  
  if (rule_id === 'MISSING_DEPLOYMENT_DATA') {
    return handleMissingDeploymentData(violation_details);
  }
  
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
 * Handle missing packing data violations
 */
function handleMissingPackingData(details) {
  const missingFields = details.missing_fields || [];
  
  if (missingFields.length === 0) {
    return {
      type: 'list',
      display: 'All packing data fields are present (unexpected violation state)'
    };
  }

  // Extract just the field names (remove "packing_data." prefix)
  const fieldNames = missingFields.map(field => {
    const parts = field.split('.');
    return parts[parts.length - 1]; // Get last part (e.g., "tote_id" from "packing_data.tote_id")
  });

  return {
    type: 'list',
    title: 'Missing Required Fields',
    items: fieldNames,
    display: `Missing ${fieldNames.length} required field${fieldNames.length > 1 ? 's' : ''}`
  };
}

/**
 * Handle missing deployment data violations
 */
function handleMissingDeploymentData(details) {
  const missingFields = details.missing_fields || [];
  
  if (missingFields.length === 0) {
    return {
      type: 'list',
      display: 'All deployment data fields are present (unexpected violation state)'
    };
  }

  // Extract just the field names (remove "deployment_data." prefix)
  const fieldNames = missingFields.map(field => {
    const parts = field.split('.');
    return parts[parts.length - 1];
  });

  return {
    type: 'list',
    title: 'Missing Required Fields',
    items: fieldNames,
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

function renderListReason(reason) {
  const listItems = reason.items
    .map(item => `<li><code>${item}</code></li>`)
    .join('');

  return `
    <div class="violation-reason-section">
      <h3>${reason.title || 'Violation Details'}</h3>
      <ul class="violation-reason-list">
        ${listItems}
      </ul>
    </div>
  `;
}

function renderFieldReason(reason) {
  return `
    <div class="violation-reason-section">
      <h3>Missing Field</h3>
      <p class="violation-reason-field">
        No value found for <code>${reason.field}</code>
      </p>
    </div>
  `;
}

function renderDuplicateReason(reason) {
  return `
    <div class="violation-reason-section">
      <h3>Duplicate Detection</h3>
      <div class="violation-reason-duplicate">
        <p>
          <strong>Item 1:</strong> ${reason.item1.name}
          ${reason.item1.id ? `<span class="item-id">(${reason.item1.id})</span>` : ''}
        </p>
        <p>
          <strong>Item 2:</strong> ${reason.item2.name}
          ${reason.item2.id ? `<span class="item-id">(${reason.item2.id})</span>` : ''}
        </p>
        <p>
          <strong>Matching Field:</strong> <code>${reason.matchingField}</code>
        </p>
        <p>
          <strong>Similarity Score:</strong> ${Math.round(reason.similarityScore * 100)}%
        </p>
      </div>
    </div>
  `;
}

function renderGenericReason(reason) {
  return `
    <div class="violation-reason-section">
      <h3>Violation Details</h3>
      <p>${reason.display}</p>
    </div>
  `;
}