import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();

  const handleGoHome = () => navigate('/dashboard');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Button variant="outline" onClick={handleGoHome}>
        Go to Dashboard
      </Button>
    </div>
  );
}
