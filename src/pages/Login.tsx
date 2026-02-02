import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mountain } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Si ya hay usuario, redirigir al dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error('Por favor ingrese email y contraseña');
      return;
    }
    
    setIsSubmitting(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      toast.success('¡Bienvenido!');
      // La redirección se hará automáticamente por el useEffect
    } else {
      toast.error(result.error || 'Email o contraseña incorrectos');
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim() || !nombre.trim()) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setIsSubmitting(true);
    
    const result = await register(email, password, nombre);
    
    if (result.success) {
      if (result.error) {
        // Mensaje informativo (como confirmar email)
        toast.info(result.error);
      } else {
        toast.success('¡Cuenta creada exitosamente!');
      }
      // La redirección se hará automáticamente por el useEffect si hay sesión
    } else {
      toast.error(result.error || 'Error al crear cuenta');
    }
    
    setIsSubmitting(false);
  };

  // Mostrar loading mientras se verifica si hay sesión
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>
      
      <Card className="w-full max-w-md animate-scale-in relative z-10 border-border/50 shadow-elevated bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-soft">
            <Mountain className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display text-foreground">
              Sucesores Pedro Pablo
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sistema de Gestión Empresarial
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-background border-input focus:border-primary transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-background border-input focus:border-primary transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    'Ingresar'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reg-nombre" className="text-foreground font-medium">
                    Nombre completo
                  </Label>
                  <Input
                    id="reg-nombre"
                    type="text"
                    placeholder="Juan Pérez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="h-11 bg-background border-input focus:border-primary transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-foreground font-medium">
                    Email
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-background border-input focus:border-primary transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-foreground font-medium">
                    Contraseña
                  </Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-background border-input focus:border-primary transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear cuenta'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
