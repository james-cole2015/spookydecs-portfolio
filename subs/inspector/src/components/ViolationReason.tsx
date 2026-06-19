/**
 * ViolationReason — React port of the `render*` functions in the vanilla
 * `violation-helper.js`. Consumes the discriminated `ViolationReason` union from
 * inspectorConfig and renders the matching layout. Logic/branches verbatim.
 */
import { Code } from '@heroui/react';
import { getViolationReason, type Violation } from '../config/inspectorConfig';

const PHOTO_SUBTYPE_HEADING: Record<string, { icon: string; title: string }> = {
  missing: { icon: '❌', title: 'Missing Primary Photo' },
  invalid_format: { icon: '⚠️', title: 'Invalid Photo ID Format' },
  not_found: { icon: '🔍', title: 'Photo Not Found' },
  missing_url: { icon: '🔗', title: 'Missing Photo URL' },
  url_not_accessible: { icon: '🚫', title: 'Photo Not Accessible' },
  error: { icon: '⚠️', title: 'Validation Error' },
};

export function ViolationReason({ violation }: { violation: Violation }) {
  const reason = getViolationReason(violation);

  switch (reason.type) {
    case 'list':
      return (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {reason.title || 'Violation Details'}
          </h3>
          <p className="text-default-600">
            <strong>{reason.count}</strong> required field{reason.count > 1 ? 's are' : ' is'}{' '}
            missing:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {reason.items.map((item) => (
              <li key={item.fullPath}>
                <Code size="sm">{item.fieldName}</Code>
                {item.parent && <span className="ml-2 text-default-500">in {item.parent}</span>}
              </li>
            ))}
          </ul>
        </section>
      );

    case 'field':
      return (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Missing Field</h3>
          <p className="text-default-600">
            No value found for <Code size="sm">{reason.field}</Code>
          </p>
        </section>
      );

    case 'photo_reference': {
      const heading = PHOTO_SUBTYPE_HEADING[reason.subtype] || {
        icon: '📷',
        title: 'Primary Photo Issue',
      };
      return (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {heading.icon} {heading.title}
          </h3>
          <p className="text-default-600">{reason.details}</p>
          {reason.subtype === 'invalid_format' && reason.value && (
            <div className="space-y-1 text-default-600">
              <p>
                <strong>Current Value:</strong> <Code size="sm">{reason.value}</Code>
              </p>
              <p>
                <strong>Expected Format:</strong> Must start with{' '}
                <Code size="sm">{reason.expectedPrefix}</Code>
              </p>
            </div>
          )}
          {reason.subtype === 'not_found' && reason.value && (
            <div className="space-y-1 text-default-600">
              <p>
                <strong>Photo ID:</strong> <Code size="sm">{reason.value}</Code>
              </p>
              <p>This photo ID does not exist in the images database.</p>
            </div>
          )}
          {reason.subtype === 'missing_url' && reason.value && (
            <div className="space-y-1 text-default-600">
              <p>
                <strong>Photo ID:</strong> <Code size="sm">{reason.value}</Code>
              </p>
              <p>
                <strong>Missing Field:</strong> <Code size="sm">{reason.urlField}</Code>
              </p>
            </div>
          )}
          {reason.subtype === 'url_not_accessible' && (
            <div className="space-y-1 text-default-600">
              {reason.value && (
                <p>
                  <strong>Photo ID:</strong> <Code size="sm">{reason.value}</Code>
                </p>
              )}
              {reason.url && (
                <p className="break-all">
                  <strong>URL:</strong> <Code size="sm">{reason.url}</Code>
                </p>
              )}
              {reason.statusCode && (
                <p>
                  <strong>HTTP Status:</strong> {String(reason.statusCode)}
                </p>
              )}
              {reason.errorMessage && (
                <p>
                  <strong>Error:</strong> {reason.errorMessage}
                </p>
              )}
            </div>
          )}
          {reason.subtype === 'error' && reason.error && (
            <div className="space-y-1 text-default-600">
              <p>
                <strong>Error Details:</strong>
              </p>
              <pre className="overflow-auto rounded bg-content2 p-2 text-sm">{reason.error}</pre>
            </div>
          )}
        </section>
      );
    }

    case 'duplicate':
      return (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Duplicate Detection</h3>
          <div className="space-y-1 text-default-600">
            <p>
              <strong>Item 1:</strong> {reason.item1.name}
              {reason.item1.id && <span className="ml-1 text-default-500">({reason.item1.id})</span>}
            </p>
            <p>
              <strong>Item 2:</strong> {reason.item2.name}
              {reason.item2.id && <span className="ml-1 text-default-500">({reason.item2.id})</span>}
            </p>
            <p>
              <strong>Matching Field:</strong> <Code size="sm">{reason.matchingField}</Code>
            </p>
            <p>
              <strong>Similarity Score:</strong> {Math.round(reason.similarityScore * 100)}%
            </p>
          </div>
        </section>
      );

    case 'generic':
    case 'unknown':
    default:
      return (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Violation Details</h3>
          <p className="text-default-600">{reason.display}</p>
        </section>
      );
  }
}
