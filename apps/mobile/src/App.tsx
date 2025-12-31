import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { router } from '@/router';
import ReloadPrompt from '@/components/ReloadPrompt';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ReloadPrompt />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}

export default App;
