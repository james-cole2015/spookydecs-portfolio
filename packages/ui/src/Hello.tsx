import { Chip, Code } from '@heroui/react';

export function Hello() {
  return (
    <div className="flex items-center gap-2 p-4">
      <Chip color="primary" variant="flat">@spookydecs/ui</Chip>
      <Code size="sm">smoke test ✓</Code>
    </div>
  );
}
