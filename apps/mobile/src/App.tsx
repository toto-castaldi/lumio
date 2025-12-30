import { VERSION, BUILD_INFO } from '@lumio/shared';

function App() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-foreground">Lumio Mobile</h1>
        <p className="text-lg text-muted-foreground">
          AI-Powered Flashcards
        </p>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Version: <span className="font-mono">v{VERSION}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Build: {BUILD_INFO.buildNumber} - {BUILD_INFO.gitSha.slice(0, 7)}
          </p>
        </div>

        <div className="mt-8">
          <p className="text-sm text-muted-foreground">
            PWA - Coming Soon
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
