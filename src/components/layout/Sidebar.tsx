import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingCart,
  ArrowLeftRight,
  LogOut,
  Mountain,
  ChevronLeft,
  Menu,
  Warehouse,
  Timer,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/ventas', icon: ShoppingCart },
  { name: 'Acopio', href: '/acopio', icon: Warehouse },
  { name: 'Movimientos', href: '/movimientos', icon: ArrowLeftRight },
  { name: 'Tiempos', href: '/tiempos', icon: Timer },
  { name: 'Simulador', href: '/simulador', icon: Calculator },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Mountain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-sidebar-foreground">SPP</span>
        </div>
      </div>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-20" : "w-64",
          "lg:translate-x-0",
          collapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && "lg:justify-center")}>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft flex-shrink-0">
              <Mountain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className={cn("transition-opacity duration-200", collapsed ? "lg:hidden opacity-0" : "opacity-100")}>
              <h1 className="font-display font-semibold text-sidebar-foreground leading-tight">
                Sucesores
              </h1>
              <p className="text-xs text-muted-foreground">Pedro Pablo</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex text-muted-foreground hover:text-sidebar-foreground"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className={cn("transition-opacity duration-200", collapsed ? "lg:hidden" : "")}>
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 mb-2",
            collapsed && "lg:justify-center lg:px-2"
          )}>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">
                {user?.nombre?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className={cn("overflow-hidden transition-opacity duration-200", collapsed ? "lg:hidden" : "")}>
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.nombre || 'Usuario'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              collapsed && "lg:justify-center"
            )}
          >
            <LogOut className="h-4 w-4" />
            <span className={cn("ml-2", collapsed && "lg:hidden")}>Cerrar sesión</span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
};

export default Sidebar;
