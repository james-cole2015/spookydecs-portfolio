/**
 * AppHeader — the native React/HeroUI top chrome for SpookyDecs React subs.
 *
 * Reproduces the contract of the CDN `<spookydecs-header>` web component
 * (`configs-spookydecs/components/spookydecs-header.js`) for subs that live
 * inside a React tree, so the header can read theme/config/auth context instead
 * of bolting a Shadow-DOM component above the app. The CDN component stays in
 * place for vanilla subs; this is the parallel React equivalent.
 *
 * Built on HeroUI Navbar primitives — the responsive menu mechanics (toggle +
 * slide-out menu) come from HeroUI, replacing the CDN component's hand-rolled
 * drawer/backdrop/Escape/scroll-lock block. Theme-aware by virtue of being a
 * HeroUI Navbar (the CDN header is fixed light-only).
 */
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Chip,
} from '@heroui/react';
import {
  Package,
  Send,
  Archive,
  Wrench,
  DollarSign,
  Search,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  FileText,
  Shield,
  Hammer,
  LogOut,
  Menu as MenuIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useConfig } from '../providers/ConfigProvider';
import { useAuth } from '../hooks/useAuth';
import { ThemeSwitch } from './ThemeSwitch';
import { DemoResetBanner } from './DemoResetBanner';

interface NavItem {
  label: string;
  configKey: string;
  Icon: LucideIcon;
}

/**
 * The 12 destinations, ported verbatim (order + config keys) from the CDN
 * component's NAV_ITEMS. Inline SVGs are mapped to lucide-react equivalents.
 */
const NAV_ITEMS: NavItem[] = [
  { label: 'Items', configKey: 'ITEMS_ADMIN', Icon: Package },
  { label: 'Deployments', configKey: 'DEPLOY_ADMIN', Icon: Send },
  { label: 'Storage', configKey: 'STR_ADM_URL', Icon: Archive },
  { label: 'Maintenance', configKey: 'MAINT_URL', Icon: Wrench },
  { label: 'Finance', configKey: 'finance_url', Icon: DollarSign },
  { label: 'Inspector', configKey: 'INSPECT_URL', Icon: Search },
  { label: 'Images', configKey: 'IMAGES_URL', Icon: ImageIcon },
  { label: 'Gallery', configKey: 'GALLERY_ADM_URL', Icon: LayoutGrid },
  { label: 'Ideas', configKey: 'IDEAS_ADMIN_URL', Icon: Lightbulb },
  { label: 'Audit', configKey: 'AUDIT_URL', Icon: FileText },
  { label: 'Admin', configKey: 'ADMIN_URL', Icon: Shield },
  { label: 'Workbench', configKey: 'WORKBENCH_URL', Icon: Hammer },
];

type ChipColor = 'warning' | 'secondary' | 'success' | 'default';

/** Mirrors the CDN role-pill palette (.user-role--admin/builder/user/demo). */
function roleColor(role: string): ChipColor {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'warning';
    case 'builder':
      return 'secondary';
    case 'user':
    case 'viewer':
      return 'success';
    default:
      return 'default';
  }
}

/** Active when the link points at the host we're currently on (hostname compare). */
function isActiveUrl(url: string): boolean {
  if (!url || typeof window === 'undefined') return false;
  try {
    return window.location.hostname === new URL(url).hostname;
  } catch {
    return false;
  }
}

interface ResolvedNavItem extends NavItem {
  url: string;
  active: boolean;
}

export interface AppHeaderProps {
  /** Shown as `SpookyDecs – {pageTitle}` (the dash + title hide on mobile). */
  pageTitle: string;
  /** Fallback logout target; defaults to `AUTH_URL` from config. */
  logoutUrl?: string;
  /** Override the JWT-derived display name (parity with the CDN attribute). */
  userName?: string;
  /** Override the JWT-derived role (parity with the CDN attribute). */
  userRole?: string;
  /** Host the theme toggle in the header. Default true. */
  showThemeSwitch?: boolean;
}

export function AppHeader({
  pageTitle,
  logoutUrl,
  userName,
  userRole,
  showThemeSwitch = true,
}: AppHeaderProps) {
  const config = useConfig();
  const { claims } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const name = userName ?? (claims?.['cognito:username'] as string | undefined) ?? 'User';
  const role = userRole ?? (claims?.['custom:role'] as string | undefined) ?? '';

  // Resolve each nav item's URL from config and drop the ones with no key set,
  // matching the CDN component's _buildNavItems().filter(item => item.url).
  const navItems: ResolvedNavItem[] = NAV_ITEMS.map((item) => {
    const url = (config[item.configKey] as string | undefined) ?? '';
    return { ...item, url, active: isActiveUrl(url) };
  }).filter((item) => item.url);

  async function handleLogout() {
    // 1. Clear the shared auth cookie across the apex domain.
    document.cookie =
      'spookydecs_auth=; domain=.spookydecs.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
    // 2. Resolve the auth endpoint (config wins, prop is the fallback).
    const target = (config.AUTH_URL as string | undefined) ?? logoutUrl ?? '/logout';
    // 3. Redirect back to login with a return path.
    window.location.href = `${target}?redirect=${encodeURIComponent(window.location.origin)}`;
  }

  return (
    <>
      <DemoResetBanner />
      <Navbar
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        maxWidth="full"
        className="mb-6 rounded-large"
        isBordered
      >
        <NavbarContent justify="start">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
            className="sm:hidden"
          />
          <NavbarBrand className="gap-1">
            <span className="font-semibold text-foreground">SpookyDecs</span>
            <span className="hidden text-default-500 sm:inline"> – {pageTitle}</span>
          </NavbarBrand>
        </NavbarContent>

        {/* Desktop cluster: app-switcher dropdown, identity, theme, logout. */}
        <NavbarContent justify="end" className="gap-3">
          <NavbarItem className="hidden sm:flex">
            <Dropdown>
              <DropdownTrigger>
                <Button variant="flat" size="sm" startContent={<MenuIcon size={16} />}>
                  Navigate
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Site navigation" items={navItems}>
                {(item: ResolvedNavItem) => (
                  <DropdownItem
                    key={item.label}
                    href={item.url}
                    startContent={<item.Icon size={16} />}
                    endContent={
                      item.active ? (
                        <Chip size="sm" color="primary" variant="flat">
                          Here
                        </Chip>
                      ) : undefined
                    }
                    className={item.active ? 'text-primary' : undefined}
                  >
                    {item.label}
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>

          <NavbarItem className="hidden items-center gap-2 sm:flex">
            <span className="text-small text-default-600">{name}</span>
            {role && (
              <Chip size="sm" variant="flat" color={roleColor(role)} className="capitalize">
                {role}
              </Chip>
            )}
          </NavbarItem>

          {showThemeSwitch && (
            <NavbarItem>
              <ThemeSwitch />
            </NavbarItem>
          )}

          <NavbarItem className="hidden sm:flex">
            <Button
              variant="bordered"
              size="sm"
              startContent={<LogOut size={16} />}
              onPress={handleLogout}
            >
              Logout
            </Button>
          </NavbarItem>
        </NavbarContent>

        {/* Mobile slide-out menu: nav links + identity + logout. */}
        <NavbarMenu>
          {navItems.map((item) => (
            <NavbarMenuItem key={item.label} isActive={item.active}>
              <a
                href={item.url}
                aria-current={item.active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 py-1 ${
                  item.active ? 'text-primary' : 'text-foreground'
                }`}
              >
                <item.Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.active && (
                  <Chip size="sm" color="primary" variant="flat">
                    Here
                  </Chip>
                )}
              </a>
            </NavbarMenuItem>
          ))}
          <NavbarMenuItem className="mt-2 flex items-center gap-2">
            <span className="text-small text-default-600">{name}</span>
            {role && (
              <Chip size="sm" variant="flat" color={roleColor(role)} className="capitalize">
                {role}
              </Chip>
            )}
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Button
              fullWidth
              variant="bordered"
              startContent={<LogOut size={16} />}
              onPress={handleLogout}
            >
              Logout
            </Button>
          </NavbarMenuItem>
        </NavbarMenu>
      </Navbar>
    </>
  );
}
