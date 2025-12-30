import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { router } from '@/router';
import ReloadPrompt from '@/components/ReloadPrompt';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ReloadPrompt />
    </AuthProvider>
  );
}

export default App;
