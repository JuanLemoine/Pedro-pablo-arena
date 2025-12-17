import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mountain } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('Por favor ingrese usuario y contraseña');
      return;
    }
    
    setIsSubmitting(true);
    
    const success = await login(username, password);
    
    if (success) {
      toast.success('¡Bienvenido!');
      navigate('/dashboard');
    } else {
      toast.error('Usuario o contraseña incorrectos');
    }
    
    setIsSubmitting(false);
  };

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
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground font-medium">
                Usuario
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
          
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Demo:</strong> usuario: <code className="bg-background px-1 rounded">admin</code> / contraseña: <code className="bg-background px-1 rounded">admin123</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
