/**
 * Landing — typed HeroUI port of js/pages/landing.js (#336).
 * Four option cards: Images, Gallery Manager, Photo Browser, Entities.
 */
import { Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, PageHeader } from '@spookydecs/ui';

interface OptionCard {
  icon: string;
  title: string;
  description: string;
  route: string;
}

const CARDS: OptionCard[] = [
  {
    icon: '🖼️',
    title: 'Images',
    description:
      'Browse and manage your photo library. Filter by season, type, and more. View metadata, references, and manage individual image records.',
    route: '/images/list',
  },
  {
    icon: '🎨',
    title: 'Gallery Manager',
    description:
      'Organize your photos into galleries. Arrange, reorder, and curate image collections for display.',
    route: '/images/gallery',
  },
  {
    icon: '📷',
    title: 'Photo Browser',
    description:
      'Explore your photo collection visually. Browse and search photos in an immersive layout.',
    route: '/images/browse',
  },
  {
    icon: '📦',
    title: 'Entities',
    description:
      'Browse photos organized by item or storage entity. View all photos for a given decoration or storage unit.',
    route: '/images/entities',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Images' }]} />
      <PageHeader
        title="Image & Media Management"
        subtitle="Browse your photo library, manage galleries, explore photos, and view your decoration items."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <Card
            key={card.route}
            isPressable
            onPress={() => navigate(card.route)}
            className="h-full"
          >
            <CardHeader className="flex items-start justify-between">
              <span className="text-4xl">{card.icon}</span>
              <Chip size="sm" color="success" variant="flat">
                Available
              </Chip>
            </CardHeader>
            <CardBody className="gap-2">
              <h3 className="text-large font-semibold text-foreground">{card.title}</h3>
              <p className="text-small text-default-500">{card.description}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
