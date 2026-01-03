import { BUILD_INFO, APP_NAME, getFullVersionString } from '@lumio/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">{APP_NAME}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="rounded-lg bg-muted p-4 font-mono text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Version:</span>
              <span>{BUILD_INFO.version}</span>
              <span className="text-muted-foreground">Build:</span>
              <span>{BUILD_INFO.buildNumber}</span>
              <span className="text-muted-foreground">Commit:</span>
              <span className="truncate">{BUILD_INFO.gitSha.slice(0, 7)}</span>
              <span className="text-muted-foreground">Date:</span>
              <span>{new Date(BUILD_INFO.buildDate).toLocaleDateString()}</span>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {getFullVersionString()} • Web
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
