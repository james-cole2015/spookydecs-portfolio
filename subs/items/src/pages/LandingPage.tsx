import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '@heroui/react';
import { Breadcrumbs, PageHeader, Typography } from '@spookydecs/ui';

const CARDS = [
  { icon: '🎃', title: 'Decorations',  description: 'Inflatables, Animatronics, and Static Props.', route: '/items?class=Decoration' },
  { icon: '💡', title: 'Lights',       description: 'String Lights, Spot Lights, and Projections.', route: '/items?class=Light' },
  { icon: '🔌', title: 'Accessories',  description: 'Cords, Plugs, and Receptacles.',               route: '/items?class=Accessory' },
  { icon: '🆕', title: 'Create Item',  description: 'Add a new item to the inventory.',             route: '/create' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Breadcrumbs crumbs={[{ label: 'Items' }]} />
      <PageHeader title="Decorations and Accessories" subtitle="Manage decorations, lights, and accessories across all seasons." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {CARDS.map((c) => (
          <Card
            key={c.title}
            isPressable
            onPress={() => navigate(c.route)}
            className="cursor-pointer"
          >
            <CardBody className="flex flex-row items-center gap-4 p-5">
              <span className="text-4xl">{c.icon}</span>
              <div>
                <Typography type="h5" className="text-foreground">{c.title}</Typography>
                <Typography type="body-sm" className="text-foreground-500">{c.description}</Typography>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
