import {
  Activity,
  Archive,
  Award,
  Banknote,
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  Coins,
  CreditCard,
  Database,
  DollarSign,
  ExternalLink,
  Filter,
  Flag,
  Folder,
  Gauge,
  Gift,
  Heart,
  Home,
  Landmark,
  Layers,
  LayoutDashboard,
  LineChart,
  Link2,
  ListTodo,
  Mail,
  MessageSquare,
  Notebook,
  Package,
  Percent,
  PieChart,
  PiggyBank,
  Receipt,
  RefreshCw,
  Repeat,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Table,
  Tag,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

/**
 * Curated subset of lucide-react icons relevant to a budgeting / productivity
 * app, used for the favorites icon picker. Keys are stored on the favorite
 * record (`icon` column) so they must stay stable once shipped.
 */
export const FAVORITE_ICON_LIBRARY = {
  Star,
  Home,
  LayoutDashboard,
  Wallet,
  CreditCard,
  PiggyBank,
  Banknote,
  Coins,
  DollarSign,
  Percent,
  Receipt,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Gauge,
  Activity,
  Calendar,
  Clock,
  Timer,
  CheckSquare,
  ListTodo,
  Repeat,
  RefreshCw,
  Bell,
  Bookmark,
  Heart,
  Flag,
  Target,
  Trophy,
  Award,
  Gift,
  Tag,
  Folder,
  Archive,
  Package,
  Database,
  Table,
  Layers,
  Notebook,
  BookOpen,
  Mail,
  MessageSquare,
  Search,
  Filter,
  Settings,
  User,
  Users,
  Building2,
  Landmark,
  ShoppingCart,
  Zap,
  Link2,
  ExternalLink,
};

export const FAVORITE_ICON_NAMES = Object.keys(FAVORITE_ICON_LIBRARY);

export const DEFAULT_FAVORITE_ICON = "Star";

export function getFavoriteIconComponent(name) {
  return FAVORITE_ICON_LIBRARY[name] || FAVORITE_ICON_LIBRARY[DEFAULT_FAVORITE_ICON];
}

/**
 * Renders a favorite's icon element directly (rather than handing back a
 * component reference for callers to tag with JSX) so lookups by name stay
 * compatible with the react-hooks "static components must be module-level"
 * lint rule.
 */
export function renderFavoriteIcon(name, props) {
  const IconComponent = getFavoriteIconComponent(name);
  return <IconComponent {...props} />;
}

/** Curated swatches shown alongside the free-form hex color input. */
export const FAVORITE_COLOR_PALETTE = [
  "#4f9cff",
  "#7c8cff",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#64748b",
];

export const FAVORITE_ICON_UPLOAD_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,.ico";

export const FAVORITE_ICON_MAX_BYTES = 300 * 1024;
