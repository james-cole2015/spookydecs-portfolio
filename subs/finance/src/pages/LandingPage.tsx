import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Sparkles, ClipboardList, ReceiptText, BarChart3, Tags, type LucideIcon } from 'lucide-react';
import { PageHeader, Typography } from '@spookydecs/ui';

interface HubCard {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
}

const CARDS: HubCard[] = [
  {
    id: 'extract',
    icon: Sparkles,
    title: 'AI Assisted Cost Record Creation',
    description: 'Upload a receipt photo and let AI pull vendor, date, amount, and category automatically.',
    route: '/new?extract=true',
  },
  {
    id: 'records',
    icon: ClipboardList,
    title: 'Cost Records',
    description: 'View, filter, and manage all cost records. Add new expenses and track spending across categories.',
    route: '/records',
  },
  {
    id: 'receipts',
    icon: ReceiptText,
    title: 'Receipts',
    description: 'Browse receipt images attached to cost records. View and download receipts by vendor or date.',
    route: '/receipts',
  },
  {
    id: 'statistics',
    icon: BarChart3,
    title: 'Statistics',
    description: 'Analyze spending patterns, category breakdowns, and cost trends over time.',
    route: '/statistics',
  },
  {
    id: 'items',
    icon: Tags,
    title: 'Items',
    description: 'Browse all items with associated cost history and spending summaries.',
    route: '/items',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Track cost records, browse receipts, analyze spending, and manage items."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Card
            key={card.id}
            isPressable
            isHoverable
            shadow="md"
            onPress={() => navigate(card.route)}
            className="bg-content1"
          >
            <CardHeader className="flex items-center gap-3 pb-0">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                <card.icon size={22} />
              </span>
              <Typography type="h5" className="text-foreground">
                {card.title}
              </Typography>
            </CardHeader>
            <CardBody>
              <Typography type="body-sm" className="text-default-500">
                {card.description}
              </Typography>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
