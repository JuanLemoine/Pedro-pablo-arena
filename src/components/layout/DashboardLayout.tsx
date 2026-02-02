import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { Loader2 } from 'lucide-react';

const DashboardLayout = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Solo redirigir si ya terminó de cargar y no hay usuario
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar loading mientras redirige
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
